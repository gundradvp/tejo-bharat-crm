import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, ListTodo, CheckCircle, FileText } from 'lucide-react';
import StatCard from './StatCard';
import { useNavigate } from 'react-router-dom';
import BulkImport from '../Customers/BulkImport';
import ProspectFollowupsWidget from '../Prospects/ProspectFollowupsWidget';

export default function AgentDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalTasks: 0,
    completedTasks: 0,
  });

  useEffect(() => {
    loadStats();
  }, [profile?.id, profile?.tenant_id]);

  const loadStats = async () => {
    try {
      const [customersRes, tasksRes] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('tasks').select('status'),
      ]);

      setStats({
        totalCustomers: customersRes.count || 0,
        totalTasks: tasksRes.data?.length || 0,
        completedTasks: tasksRes.data?.filter(t => t.status === 'completed').length || 0,
      });
    } catch (error) {
      console.error('Error loading agent dashboard stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile?.full_name || 'Agent'}
        </h1>
        <p className="text-gray-600 mt-1">Lead generator & agent overview</p>
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
          onClick={() => navigate('/tasks')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BulkImport />
        <ProspectFollowupsWidget />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button
          onClick={() => navigate('/customers')}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            Manage Customers
          </h3>
          <p className="text-gray-600 text-sm mt-1">Browse and manage customer applications, search & track status</p>
        </button>

        <button
          onClick={() => navigate('/tasks')}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <ListTodo className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
            Tasks & Workflows
          </h3>
          <p className="text-gray-600 text-sm mt-1">View assigned customer tasks, follow-ups, and actions</p>
        </button>

        <button
          onClick={() => navigate('/quotations')}
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all text-left group cursor-pointer"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
            Solar Quotations
          </h3>
          <p className="text-gray-600 text-sm mt-1">Create, download, and manage customer solar estimates</p>
        </button>
      </div>
    </div>
  );
}
