import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import StatCard from './StatCard';
import CustomerList from '../Customers/CustomerList';

export default function AgentDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    completedCustomers: 0,
    inProgressCustomers: 0,
    pendingCustomers: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('overall_status')
        .eq('assigned_agent_id', profile?.id);

      if (error) throw error;

      const stats = {
        totalCustomers: customers?.length || 0,
        completedCustomers: customers?.filter(c => c.overall_status === 'completed').length || 0,
        inProgressCustomers: customers?.filter(c => c.overall_status === 'in_progress').length || 0,
        pendingCustomers: customers?.filter(c => c.overall_status === 'new' || c.overall_status === 'pending_docs').length || 0,
      };

      setStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {profile?.full_name}</h1>
        <p className="text-gray-600 mt-1">Here's your customer overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Completed"
          value={stats.completedCustomers}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgressCustomers}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Pending"
          value={stats.pendingCustomers}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      <CustomerList />
    </div>
  );
}
