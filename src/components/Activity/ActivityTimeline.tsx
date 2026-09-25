import { useState, useEffect } from 'react';
import { Clock, MessageCircle, CheckCircle, FileText, DollarSign, UserPlus, Edit } from 'lucide-react';
import { getActivityLogs } from '../../lib/notesApi';
import type { ActivityLog } from '../../lib/supabase';
import { formatRelativeTime } from '../../lib/notesApi';

interface ActivityTimelineProps {
  entityType: 'customer' | 'task';
  entityId: string;
  limit?: number;
}

const activityIcons = {
  note_added: MessageCircle,
  status_change: Edit,
  task_assigned: UserPlus,
  task_completed: CheckCircle,
  document_uploaded: FileText,
  payment_received: DollarSign,
  customer_created: UserPlus,
  customer_updated: Edit,
};

const activityColors = {
  note_added: 'bg-blue-100 text-blue-600',
  status_change: 'bg-purple-100 text-purple-600',
  task_assigned: 'bg-teal-100 text-teal-600',
  task_completed: 'bg-green-100 text-green-600',
  document_uploaded: 'bg-indigo-100 text-indigo-600',
  payment_received: 'bg-emerald-100 text-emerald-600',
  customer_created: 'bg-blue-100 text-blue-600',
  customer_updated: 'bg-purple-100 text-purple-600',
};

export default function ActivityTimeline({ entityType, entityId, limit = 50 }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [entityType, entityId, limit]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await getActivityLogs(entityType, entityId, limit);
      setActivities(data);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupActivitiesByDate = (activities: ActivityLog[]) => {
    const groups: { [key: string]: ActivityLog[] } = {};

    activities.forEach(activity => {
      const date = new Date(activity.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateKey: string;
      if (date.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday';
      } else {
        dateKey = date.toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });

    return groups;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No activity yet</p>
        <p className="text-sm text-gray-500 mt-1">Activity will appear here as things happen</p>
      </div>
    );
  }

  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <div className="space-y-6">
      {Object.entries(groupedActivities).map(([date, dateActivities]) => (
        <div key={date}>
          <h4 className="text-sm font-semibold text-gray-700 mb-3 sticky top-0 bg-gray-50 py-2 px-3 rounded-lg">
            {date}
          </h4>

          <div className="relative border-l-2 border-gray-200 ml-6 space-y-4">
            {dateActivities.map((activity, index) => {
              const IconComponent = activityIcons[activity.activity_type];
              const colorClass = activityColors[activity.activity_type];

              return (
                <div key={activity.id} className="relative pl-6 pb-4">
                  <div className={`absolute -left-4 top-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClass}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-gray-900 font-medium mb-1">{activity.description}</p>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{activity.profiles?.full_name || 'System'}</span>
                      <span>{formatRelativeTime(activity.created_at)}</span>
                    </div>

                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <details className="text-xs text-gray-600">
                          <summary className="cursor-pointer hover:text-gray-900">View details</summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded overflow-x-auto">
                            {JSON.stringify(activity.metadata, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
