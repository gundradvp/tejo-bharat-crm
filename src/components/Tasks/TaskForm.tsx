import { useState, useEffect } from 'react';
import { supabase, Task, Customer, Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { X, Loader2, Save, Trash2, Bell, MessageCircle, ExternalLink } from 'lucide-react';

interface TaskFormProps {
  task: Task | null;
  onClose: () => void;
}

export default function TaskForm({ task, onClose }: TaskFormProps) {
  const { profile } = useAuth();
  const { currentTenant, isLoading: tenantLoading } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [reminder, setReminder] = useState({ enabled: false, remind_at: '', message: '' });

  const [formData, setFormData] = useState({
    customer_id: '',
    assigned_to: '',
    title: '',
    description: '',
    task_type: 'other',
    status: 'pending',
    priority: 'medium',
    due_date: '',
    remarks: '',
  });

  useEffect(() => {
    loadCustomers();
    loadEmployees();

    if (task) {
      setFormData({
        customer_id: task.customer_id,
        assigned_to: task.assigned_to,
        title: task.title,
        description: task.description || '',
        task_type: task.task_type,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date || '',
        remarks: task.remarks,
      });
      loadTaskCustomers(task.id);
      loadExistingReminder(task.id);
    }
  }, [task]);

  const loadTaskCustomers = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('task_customers')
        .select('customer_id')
        .eq('task_id', taskId)
        .order('order_index');

      if (error) throw error;
      if (data && data.length > 0) {
        setSelectedCustomers(data.map(tc => tc.customer_id));
      } else if (formData.customer_id) {
        setSelectedCustomers([formData.customer_id]);
      }
    } catch (error) {
      console.error('Error loading task customers:', error);
    }
  };

  const loadExistingReminder = async (taskId: string) => {
    try {
      const { data } = await supabase
        .from('task_reminders')
        .select('*')
        .eq('task_id', taskId)
        .eq('status', 'pending')
        .maybeSingle();

      if (data) {
        setReminder({
          enabled: true,
          remind_at: data.remind_at.slice(0, 16),
          message: data.message,
        });
      }
    } catch {
      // no existing reminder
    }
  };

  const loadCustomers = async () => {
    try {
      let query = supabase.from('customers').select('*').order('customer_name');

      const userRoles = profile?.roles || (profile?.role ? [profile.role] : []);
      if (userRoles.includes('lead_generator') && !userRoles.includes('admin')) {
        query = query.eq('agent_id', profile.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const buildWhatsAppLink = (assignedEmployee: Profile | undefined, taskTitle: string, customerNames: string[], dueDate: string) => {
    if (!assignedEmployee?.phone) return null;
    const phone = assignedEmployee.phone.replace(/\D/g, '');
    const dialCode = phone.startsWith('91') ? phone : `91${phone}`;
    const duePart = dueDate ? `\nDue: ${new Date(dueDate).toLocaleDateString('en-IN')}` : '';
    const customersPart = customerNames.length > 0 ? `\nCustomers: ${customerNames.join(', ')}` : '';
    const message = encodeURIComponent(
      `Hi ${assignedEmployee.full_name}, you have been assigned a task:\n\n*${taskTitle}*${customersPart}${duePart}\n\nPlease check the Solar CRM for details.`
    );
    return `https://wa.me/${dialCode}?text=${message}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWhatsappLink(null);

    if (selectedCustomers.length === 0) {
      setError('Please select at least one customer');
      return;
    }

    setLoading(true);

    try {
      if (!currentTenant?.id) {
        throw new Error('Tenant information not available');
      }

      const taskData = {
        ...formData,
        customer_id: selectedCustomers[0],
        assigned_by: profile?.id,
        tenant_id: currentTenant.id,
        completed_at: formData.status === 'completed' ? new Date().toISOString() : null,
      };

      let taskId = task?.id;

      if (task) {
        const { error: updateError } = await supabase
          .from('tasks')
          .update(taskData)
          .eq('id', task.id);

        if (updateError) throw updateError;
      } else {
        const { data: newTask, error: insertError } = await supabase
          .from('tasks')
          .insert(taskData)
          .select()
          .single();

        if (insertError) throw insertError;
        taskId = newTask.id;
      }

      if (taskId) {
        const { error: deleteError } = await supabase
          .from('task_customers')
          .delete()
          .eq('task_id', taskId);

        if (deleteError) throw deleteError;

        const taskCustomers = selectedCustomers.map((customerId, index) => ({
          task_id: taskId,
          customer_id: customerId,
          tenant_id: currentTenant.id,
          order_index: index,
          status: 'pending' as const,
        }));

        const { error: insertCustomersError } = await supabase
          .from('task_customers')
          .insert(taskCustomers);

        if (insertCustomersError) throw insertCustomersError;

        // Save / update reminder
        if (reminder.enabled && reminder.remind_at && reminder.message) {
          const assignedEmployee = employees.find(e => e.id === formData.assigned_to);
          const reminderPhone = assignedEmployee?.phone?.replace(/\D/g, '') || '';
          // Cancel old pending reminders for this task first
          await supabase
            .from('task_reminders')
            .update({ status: 'cancelled' })
            .eq('task_id', taskId)
            .eq('status', 'pending');

          if (reminderPhone) {
            await supabase.from('task_reminders').insert({
              task_id: taskId,
              tenant_id: currentTenant.id,
              created_by: profile?.id,
              remind_at: new Date(reminder.remind_at).toISOString(),
              phone: reminderPhone.startsWith('91') ? reminderPhone : `91${reminderPhone}`,
              message: reminder.message,
              status: 'pending',
            });
          }
        }

        // Build WhatsApp link for manual sending
        const assignedEmployee = employees.find(e => e.id === formData.assigned_to);
        const customerNames = selectedCustomers
          .map(id => customers.find(c => c.id === id)?.customer_name)
          .filter(Boolean) as string[];
        const link = buildWhatsAppLink(assignedEmployee, formData.title, customerNames, formData.due_date);
        if (link) {
          setWhatsappLink(link);
        }

        // WhatsApp notification via Deropo API
        try {
          const notifRes = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-task-notification`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                taskId,
                isNew: !task,
                assignedToEmail: assignedEmployee?.email,
                assignedToName: assignedEmployee?.full_name,
                assignedToPhone: assignedEmployee?.phone,
                taskTitle: formData.title,
                taskType: formData.task_type,
                priority: formData.priority,
                dueDate: formData.due_date,
                customerNames,
              }),
            }
          );
          const notifJson = await notifRes.json();
          console.log('[WhatsApp Notification]', notifJson);
        } catch (notifError) {
          console.error('[WhatsApp Notification] Failed:', notifError);
        }

        // Auto-open WhatsApp if we have a link
        if (link) {
          window.open(link, '_blank', 'noopener,noreferrer');
        }
      }

      if (!whatsappLink) onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = (customerId: string) => {
    if (customerId && !selectedCustomers.includes(customerId)) {
      setSelectedCustomers([...selectedCustomers, customerId]);
    }
  };

  const removeCustomer = (customerId: string) => {
    setSelectedCustomers(selectedCustomers.filter(id => id !== customerId));
  };

  const userRolesForEdit = profile?.roles || (profile?.role ? [profile.role] : []);
  const canEdit = userRolesForEdit.includes('admin') || task?.assigned_to === profile?.id;

  const assignedEmployee = employees.find(e => e.id === formData.assigned_to);
  const hasPhone = !!assignedEmployee?.phone;

  if (tenantLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading tenant information...</p>
        </div>
      </div>
    );
  }

  if (!currentTenant?.id) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md">
          <div className="text-red-600 mb-4">
            <X className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Tenant Not Available</h3>
          <p className="text-gray-600 mb-4">
            Unable to load tenant information. Please log out and log back in.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {task ? 'Edit Task' : 'Assign New Task'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WhatsApp success banner */}
        {whatsappLink && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800">Task saved! WhatsApp opened.</p>
                <p className="text-xs text-green-700 mt-0.5">
                  If it didn't open,{' '}
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    click here to send the message
                  </a>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex-shrink-0"
            >
              Done
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!!(task && !canEdit)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!!(task && !canEdit)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customers * (Select multiple for subtasks)
              </label>
              <div className="flex gap-2 mb-3">
                <select
                  value=""
                  onChange={(e) => addCustomer(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={!!(task && !canEdit)}
                >
                  <option value="">Select Customer to Add</option>
                  {customers
                    .filter(c => !selectedCustomers.includes(c.id))
                    .map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.customer_name} - {customer.phone}
                      </option>
                    ))}
                </select>
              </div>

              {selectedCustomers.length > 0 && (
                <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-xs font-medium text-gray-600 mb-2">
                    Selected Customers ({selectedCustomers.length})
                  </p>
                  {selectedCustomers.map((customerId, index) => {
                    const customer = customers.find(c => c.id === customerId);
                    return customer ? (
                      <div
                        key={customerId}
                        className="flex items-center justify-between bg-white p-2 rounded border border-gray-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            #{index + 1}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{customer.customer_name}</span>
                          <span className="text-xs text-gray-500">{customer.phone}</span>
                        </div>
                        {(!task || canEdit) && (
                          <button
                            type="button"
                            onClick={() => removeCustomer(customerId)}
                            className="p-1 hover:bg-red-50 rounded transition-colors text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              {selectedCustomers.length === 0 && (
                <p className="text-sm text-gray-500 italic">No customers selected</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign To *</label>
              <select
                required
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!!(task && profile?.role !== 'admin')}
              >
                <option value="">Select Employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}{employee.phone ? ` (${employee.phone})` : ''}
                  </option>
                ))}
              </select>
              {formData.assigned_to && !hasPhone && (
                <p className="text-xs text-amber-600 mt-1">No phone number on this employee's profile — WhatsApp will be skipped.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Type *</label>
              <select
                required
                value={formData.task_type}
                onChange={(e) => setFormData({ ...formData, task_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!!(task && !canEdit)}
              >
                <option value="document_collection">Document Collection</option>
                <option value="eb_change">EB Change</option>
                <option value="follow_up">Follow Up</option>
                <option value="installation">Installation</option>
                <option value="verification">Verification</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add notes or updates..."
              />
            </div>
          </div>

          {/* Reminder section */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setReminder(r => ({ ...r, enabled: !r.enabled }))}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                reminder.enabled ? 'bg-amber-50 text-amber-800' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Bell className={`w-4 h-4 ${reminder.enabled ? 'text-amber-600' : 'text-gray-500'}`} />
              Set Reminder
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
                reminder.enabled ? 'bg-amber-200 text-amber-800' : 'bg-gray-200 text-gray-600'
              }`}>
                {reminder.enabled ? 'On' : 'Off'}
              </span>
            </button>

            {reminder.enabled && (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Remind at *</label>
                  <input
                    type="datetime-local"
                    value={reminder.remind_at}
                    onChange={(e) => setReminder(r => ({ ...r, remind_at: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Reminder Message *
                  </label>
                  <textarea
                    rows={3}
                    value={reminder.message}
                    onChange={(e) => setReminder(r => ({ ...r, message: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder={`e.g. Reminder: Follow up on ${formData.title || 'this task'}`}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This message will be sent via WhatsApp to the assigned employee's phone (91+number) at the scheduled time.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp info line */}
          {formData.assigned_to && hasPhone && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <MessageCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                On save, WhatsApp will open to notify{' '}
                <strong>{assignedEmployee?.full_name}</strong> (91{assignedEmployee?.phone?.replace(/\D/g, '')})
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            {canEdit && (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    {task ? 'Update' : 'Assign'} Task
                    {hasPhone && <ExternalLink className="w-3.5 h-3.5 opacity-70" />}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
