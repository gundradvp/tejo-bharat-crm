import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, ListTodo, CheckCircle, UsersRound, Settings, GitBranch } from 'lucide-react';
import StatCard from './StatCard';
import { useNavigate } from 'react-router-dom';
import BulkImport from '../Customers/BulkImport';
import ProspectFollowupsWidget from '../Prospects/ProspectFollowupsWidget';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalTasks: 0,
    completedTasks: 0,
    totalAgents: 0,
  });
  const [workflowStats, setWorkflowStats] = useState<Record<string, number>>({});

  useEffect(() => {
    loadStats();
    loadWorkflowStats();
  }, []);

  const loadStats = async () => {
    try {
      const [customersRes, tasksRes, agentsRes] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('status'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'lead_generator'),
      ]);

      setStats({
        totalCustomers: customersRes.count || 0,
        totalTasks: tasksRes.data?.length || 0,
        completedTasks: tasksRes.data?.filter(t => t.status === 'completed').length || 0,
        totalAgents: agentsRes.count || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadWorkflowStats = async () => {
    try {
      const [customersRes, stagesRes] = await Promise.all([
        supabase.from('customers').select('current_workflow_stage'),
        supabase.from('workflow_stages').select('*').eq('is_active', true).order('stage_order'),
      ]);

      const stageCounts: Record<string, number> = {};
      stagesRes.data?.forEach(stage => {
        stageCounts[stage.stage_code] = customersRes.data?.filter(c => c.current_workflow_stage === stage.stage_code).length || 0;
      });

      setWorkflowStats(stageCounts);
    } catch (error) {
      console.error('Error loading workflow stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">System overview and management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon={Users}
          color="blue"
          onClick={() => navigate('/customers')}
        />
        <StatCard
          title="Total Tasks"
          value={stats.totalTasks}
          icon={ListTodo}
          color="slate"
          onClick={() => navigate('/tasks')}
        />
        <StatCard
          title="Completed Tasks"
          value={stats.completedTasks}
          icon={CheckCircle}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BulkImport />
        <ProspectFollowupsWidget />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/users')}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <UsersRound className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            Manage Users
          </h3>
          <p className="text-gray-600 text-sm mt-1">Create and manage employees & lead generators</p>
        </button>

        <button
          onClick={() => navigate('/workflow')}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <GitBranch className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
            Workflow Management
          </h3>
          <p className="text-gray-600 text-sm mt-1">Configure project workflow stages & tracking</p>
        </button>

        <button
          onClick={() => navigate('/settings/custom-status')}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 group text-left"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
              <Settings className="w-6 h-6 text-teal-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
            Custom Status Settings
          </h3>
          <p className="text-gray-600 text-sm mt-1">Manage custom statuses for tasks & customers</p>
        </button>
      </div>
    </div>
  );
}
