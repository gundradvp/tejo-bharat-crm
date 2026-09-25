import { useState, useEffect } from 'react';
import { supabase, TaskTimeLog } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Play, Pause, Square, Clock, Loader2 } from 'lucide-react';

interface TaskTimerProps {
  taskId: string;
  onTimeLogChange?: () => void;
}

export default function TaskTimer({ taskId, onTimeLogChange }: TaskTimerProps) {
  const { profile } = useAuth();
  const [activeLog, setActiveLog] = useState<TaskTimeLog | null>(null);
  const [timeLogs, setTimeLogs] = useState<TaskTimeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadTimeLogs();
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [taskId]);

  const loadTimeLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('task_time_logs')
        .select('*')
        .eq('task_id', taskId)
        .eq('user_id', profile?.id)
        .order('start_time', { ascending: false });

      if (error) throw error;

      const active = data?.find((log) => log.is_active);
      setActiveLog(active || null);
      setTimeLogs(data || []);
    } catch (error) {
      console.error('Error loading time logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTimer = async () => {
    try {
      const { error } = await supabase.from('task_time_logs').insert({
        task_id: taskId,
        user_id: profile?.id,
        tenant_id: profile?.tenant_id,
        start_time: new Date().toISOString(),
        is_active: true,
      });

      if (error) throw error;

      const { error: taskError } = await supabase
        .from('tasks')
        .update({
          started_at: new Date().toISOString(),
          status: 'in_progress'
        })
        .eq('id', taskId)
        .is('started_at', null);

      if (taskError) console.error('Error updating task:', taskError);

      await loadTimeLogs();
      onTimeLogChange?.();
    } catch (error: any) {
      console.error('Error starting timer:', error);
      alert(error.message || 'Failed to start timer');
    }
  };

  const handleStopTimer = async () => {
    if (!activeLog) return;

    try {
      const { error } = await supabase
        .from('task_time_logs')
        .update({
          end_time: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', activeLog.id);

      if (error) throw error;

      await loadTimeLogs();
      onTimeLogChange?.();
    } catch (error: any) {
      console.error('Error stopping timer:', error);
      alert(error.message || 'Failed to stop timer');
    }
  };

  const calculateCurrentDuration = () => {
    if (!activeLog) return 0;

    const start = new Date(activeLog.start_time);
    const now = currentTime;
    return Math.floor((now.getTime() - start.getTime()) / 1000);
  };

  const calculateTotalTime = () => {
    const completedTime = timeLogs
      .filter((log) => !log.is_active && log.duration_minutes)
      .reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

    const currentDuration = activeLog ? calculateCurrentDuration() / 60 : 0;
    return completedTime + currentDuration;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  const formatTotalMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);

    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  const totalTime = calculateTotalTime();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-500" />
        <div className="text-sm">
          {activeLog ? (
            <span className="font-mono font-medium text-blue-600">
              {formatDuration(calculateCurrentDuration())}
            </span>
          ) : (
            <span className="text-gray-600">
              {totalTime > 0 ? formatTotalMinutes(totalTime) : '0m'}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {activeLog ? (
          <button
            onClick={handleStopTimer}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
            title="Stop Timer"
          >
            <Square className="w-4 h-4" />
            Stop
          </button>
        ) : (
          <button
            onClick={handleStartTimer}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
            title="Start Timer"
          >
            <Play className="w-4 h-4" />
            Start
          </button>
        )}
      </div>
    </div>
  );
}
