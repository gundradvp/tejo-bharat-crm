import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { Plus, CreditCard as Edit2, Trash2, Search, Users, Phone, Mail, MapPin, DollarSign, Calendar, User, CheckCircle, XCircle, Loader2, Copy, PhoneCall, Shield, X } from 'lucide-react';
import CascadingLocationSelector from '../Common/CascadingLocationSelector';
import { useStates, useDistricts, useConstituencies, useMandals, useVillages } from '../../hooks/useLocations';

interface LeadGenerator {
  id: string;
  tenant_id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  commission_amount: number;
  village: string | null;
  mandal: string | null;
  district: string | null;
  state: string | null;
  state_id?: number;
  district_id?: number;
  constituency_id?: number;
  mandal_id?: number;
  village_id?: number;
  pincode: string | null;
  status: 'active' | 'inactive';
  added_by_user_id: string;
  added_at: string;
  notes: string | null;
  added_by?: {
    full_name: string;
  };
  customer_count?: number;
  total_advances?: number;
  total_commission?: number;
}

interface LeadGeneratorAdvance {
  id: string;
  lead_generator_id: string;
  customer_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  given_by_user_id: string;
  customer?: {
    name: string;
    application_ref_no: string;
  };
  given_by?: {
    full_name: string;
  };
}

export default function LeadGeneratorManagement() {
  const { profile, canManageLeadGenerators } = useAuth();
  const { currentTenant } = useTenant();
  const [leadGenerators, setLeadGenerators] = useState<LeadGenerator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [locationFilter, setLocationFilter] = useState<{
    stateId?: number;
    districtId?: number;
    constituencyId?: number;
    mandalId?: number;
    villageId?: number;
  }>({});
  const [showForm, setShowForm] = useState(false);
  const [editingLeadGen, setEditingLeadGen] = useState<LeadGenerator | null>(null);
  const [selectedLeadGen, setSelectedLeadGen] = useState<LeadGenerator | null>(null);
  const [advances, setAdvances] = useState<LeadGeneratorAdvance[]>([]);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    commission_amount: 0,
    village: '',
    mandal: '',
    district: '',
    state: '',
    state_id: undefined as number | undefined,
    district_id: undefined as number | undefined,
    constituency_id: undefined as number | undefined,
    mandal_id: undefined as number | undefined,
    village_id: undefined as number | undefined,
    pincode: '',
    status: 'active' as 'active' | 'inactive',
    notes: '',
  });

  // Lookup values
  const [villages, setVillages] = useState<string[]>([]);
  const [mandals, setMandals] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);

  const [advanceFormData, setAdvanceFormData] = useState({
    customer_id: '',
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    reference_number: '',
    notes: '',
  });

  useEffect(() => {
    loadLeadGenerators();
    loadCustomers();
    loadLookupValues();
  }, [currentTenant]);

  useEffect(() => {
    if (selectedLeadGen) {
      loadAdvances(selectedLeadGen.id);
    }
  }, [selectedLeadGen]);

  const loadLookupValues = async () => {
    try {
      const { data, error } = await supabase
        .from('lookup_values')
        .select('category, value')
        .in('category', ['village', 'mandal', 'district'])
        .order('value');

      if (error) throw error;

      const villagesList = data?.filter(d => d.category === 'village').map(d => d.value) || [];
      const mandalsList = data?.filter(d => d.category === 'mandal').map(d => d.value) || [];
      const districtsList = data?.filter(d => d.category === 'district').map(d => d.value) || [];

      setVillages(villagesList);
      setMandals(mandalsList);
      setDistricts(districtsList);
    } catch (error) {
      console.error('Error loading lookup values:', error);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert(`${label} copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const makePhoneCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  const loadLeadGenerators = async () => {
    try {
      setLoading(true);
      console.log('Loading lead generators...');

      // First try without the join to see if that's the issue
      const { data: basicData, error: basicError } = await supabase
        .from('lead_generators')
        .select('*')
        .order('created_at', { ascending: false });

      if (basicError) {
        console.error('Error loading lead generators (basic):', basicError);
        throw basicError;
      }

      console.log('Lead generators loaded (basic):', basicData?.length || 0, 'records');
      console.log('Basic data:', basicData);

      if (!basicData || basicData.length === 0) {
        setLeadGenerators([]);
        return;
      }

      // Now try to get the profile data separately
      const dataWithProfiles = await Promise.all(
        basicData.map(async (lg) => {
          let addedBy = null;
          if (lg.added_by_user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', lg.added_by_user_id)
              .maybeSingle();
            addedBy = profileData;
          }
          return {
            ...lg,
            added_by: addedBy,
          };
        })
      );

      console.log('Data with profiles:', dataWithProfiles);

      // Load stats for each lead generator
      const leadGensWithStats = await Promise.all(
        dataWithProfiles.map(async (lg) => {
          const [customerCount, advancesSum, commissionSum] = await Promise.all([
            supabase
              .from('customers')
              .select('id', { count: 'exact', head: true })
              .eq('introduced_by_lead_generator_id', lg.id),
            supabase
              .from('lead_generator_advances')
              .select('amount')
              .eq('lead_generator_id', lg.id),
            supabase
              .from('customers')
              .select('commission_amount')
              .eq('introduced_by_lead_generator_id', lg.id),
          ]);

          const totalAdvances = advancesSum.data?.reduce((sum, a) => sum + Number(a.amount), 0) || 0;
          const totalCommission = commissionSum.data?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

          return {
            ...lg,
            customer_count: customerCount.count || 0,
            total_advances: totalAdvances,
            total_commission: totalCommission,
          };
        })
      );

      console.log('Lead generators with stats:', leadGensWithStats);
      console.log('Setting state with', leadGensWithStats.length, 'items');
      setLeadGenerators(leadGensWithStats);
    } catch (error) {
      console.error('Error loading lead generators:', error);
      alert('Error loading lead generators. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, application_ref_no')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadAdvances = async (leadGenId: string) => {
    try {
      const { data, error } = await supabase
        .from('lead_generator_advances')
        .select(`
          *,
          customer:customers(name, application_ref_no),
          given_by:profiles!lead_generator_advances_given_by_user_id_fkey(full_name)
        `)
        .eq('lead_generator_id', leadGenId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setAdvances(data || []);
    } catch (error) {
      console.error('Error loading advances:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('=== Lead Generator Form Submission ===');
    console.log('Current Tenant:', currentTenant);
    console.log('Profile:', profile);
    console.log('Form Data:', formData);

    if (!currentTenant?.id) {
      console.error('No tenant ID found');
      alert('Unable to determine tenant. Please refresh the page.');
      return;
    }

    if (!profile?.id) {
      console.error('No profile ID found');
      alert('Unable to determine user. Please refresh the page.');
      return;
    }

    const dataToInsert = {
      full_name: formData.full_name,
      phone: formData.phone,
      email: formData.email || null,
      address: formData.address || null,
      commission_amount: formData.commission_amount || 0,
      village: formData.village || null,
      mandal: formData.mandal || null,
      district: formData.district || null,
      state: formData.state || null,
      state_id: formData.state_id || null,
      district_id: formData.district_id || null,
      constituency_id: formData.constituency_id || null,
      mandal_id: formData.mandal_id || null,
      village_id: formData.village_id || null,
      pincode: formData.pincode || null,
      status: formData.status,
      notes: formData.notes || null,
      tenant_id: currentTenant.id,
      added_by_user_id: profile.id,
    };

    console.log('Data to insert:', dataToInsert);

    try {
      if (editingLeadGen) {
        console.log('Updating lead generator:', editingLeadGen.id);
        const { error } = await supabase
          .from('lead_generators')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            email: formData.email || null,
            address: formData.address || null,
            commission_amount: formData.commission_amount || 0,
            village: formData.village || null,
            mandal: formData.mandal || null,
            district: formData.district || null,
            state: formData.state || null,
            state_id: formData.state_id || null,
            district_id: formData.district_id || null,
            constituency_id: formData.constituency_id || null,
            mandal_id: formData.mandal_id || null,
            village_id: formData.village_id || null,
            pincode: formData.pincode || null,
            status: formData.status,
            notes: formData.notes || null,
          })
          .eq('id', editingLeadGen.id);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        console.log('Lead generator updated successfully');
      } else {
        console.log('Inserting new lead generator...');
        const { data, error } = await supabase
          .from('lead_generators')
          .insert([dataToInsert])
          .select();

        if (error) {
          console.error('Insert error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }
        console.log('Lead generator created successfully:', data);
      }

      setShowForm(false);
      setEditingLeadGen(null);
      resetForm();
      await loadLeadGenerators();
      alert('Lead generator saved successfully!');
    } catch (error: any) {
      console.error('=== Error Details ===');
      console.error('Message:', error.message);
      console.error('Details:', error.details);
      console.error('Hint:', error.hint);
      console.error('Code:', error.code);
      console.error('Full error:', error);
      alert(`Error saving lead generator: ${error.message || 'Unknown error'}. Check console for details.`);
    }
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadGen) return;

    try {
      const { error } = await supabase
        .from('lead_generator_advances')
        .insert([{
          ...advanceFormData,
          lead_generator_id: selectedLeadGen.id,
          tenant_id: currentTenant?.id,
          given_by_user_id: profile?.id,
        }]);

      if (error) throw error;

      setShowAdvanceForm(false);
      resetAdvanceForm();
      loadAdvances(selectedLeadGen.id);
      loadLeadGenerators();
    } catch (error) {
      console.error('Error saving advance:', error);
      alert('Error saving advance');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead generator?')) return;

    try {
      const { error } = await supabase
        .from('lead_generators')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadLeadGenerators();
    } catch (error) {
      console.error('Error deleting lead generator:', error);
      alert('Error deleting lead generator');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      address: '',
      commission_amount: 0,
      village: '',
      mandal: '',
      district: '',
      state: '',
      state_id: undefined,
      district_id: undefined,
      constituency_id: undefined,
      mandal_id: undefined,
      village_id: undefined,
      pincode: '',
      status: 'active',
      notes: '',
    });
  };

  const resetAdvanceForm = () => {
    setAdvanceFormData({
      customer_id: '',
      amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      reference_number: '',
      notes: '',
    });
  };

  const startEdit = (leadGen: LeadGenerator) => {
    setEditingLeadGen(leadGen);
    setFormData({
      full_name: leadGen.full_name,
      phone: leadGen.phone,
      email: leadGen.email || '',
      address: leadGen.address || '',
      commission_amount: leadGen.commission_amount,
      village: leadGen.village || '',
      mandal: leadGen.mandal || '',
      district: leadGen.district || '',
      state: leadGen.state || '',
      state_id: leadGen.state_id,
      district_id: leadGen.district_id,
      constituency_id: leadGen.constituency_id,
      mandal_id: leadGen.mandal_id,
      village_id: leadGen.village_id,
      pincode: leadGen.pincode || '',
      status: leadGen.status,
      notes: leadGen.notes || '',
    });
    setShowForm(true);
  };

  const filteredLeadGenerators = leadGenerators.filter((lg) => {
    const matchesSearch =
      lg.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lg.phone.includes(searchTerm) ||
      lg.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lg.status === statusFilter;

    const matchesLocation = (() => {
      if (!locationFilter.stateId && !locationFilter.districtId && !locationFilter.constituencyId && !locationFilter.mandalId && !locationFilter.villageId) {
        return true;
      }
      if (locationFilter.villageId && lg.village_id !== locationFilter.villageId) return false;
      if (locationFilter.mandalId && lg.mandal_id !== locationFilter.mandalId) return false;
      if (locationFilter.constituencyId && lg.constituency_id !== locationFilter.constituencyId) return false;
      if (locationFilter.districtId && lg.district_id !== locationFilter.districtId) return false;
      if (locationFilter.stateId && lg.state_id !== locationFilter.stateId) return false;
      return true;
    })();

    return matchesSearch && matchesStatus && matchesLocation;
  });

  if (!canManageLeadGenerators()) {
    return (
      <div className="text-center py-8 theme-text-secondary">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg font-medium">Access Restricted</p>
        <p className="text-sm mt-1">You need Lead Generator Access or Admin role to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lead Generators</h2>
          <p className="text-gray-600">Manage lead generators and track their performance</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingLeadGen(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-5 w-5" />
          Add Lead Generator
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <LocationFilters
          stateId={locationFilter.stateId}
          districtId={locationFilter.districtId}
          constituencyId={locationFilter.constituencyId}
          mandalId={locationFilter.mandalId}
          villageId={locationFilter.villageId}
          onChange={setLocationFilter}
        />
      </div>

      {/* Lead Generators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLeadGenerators.map((lg) => (
          <div key={lg.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{lg.full_name}</h3>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                      lg.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {lg.status === 'active' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {lg.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(lg)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                {canManageLeadGenerators() && (
                  <button
                    onClick={() => handleDelete(lg.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {lg.phone}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => copyToClipboard(lg.phone, 'Phone number')}
                    className="p-1 text-gray-500 hover:bg-gray-100 rounded"
                    title="Copy phone number"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => makePhoneCall(lg.phone)}
                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                    title="Call"
                  >
                    <PhoneCall className="h-3 w-3" />
                  </button>
                </div>
              </div>
              {lg.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="h-4 w-4" />
                  {lg.email}
                </div>
              )}
              {(lg.village || lg.mandal || lg.district) && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {[lg.village, lg.mandal, lg.district].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">{lg.customer_count}</div>
                <div className="text-xs text-gray-600">Customers</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">₹{(lg.total_commission || 0).toLocaleString()}</div>
                <div className="text-xs text-gray-600">Commission</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">₹{(lg.total_advances || 0).toLocaleString()}</div>
                <div className="text-xs text-gray-600">Advances</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-600">
                Commission: <span className="font-semibold">₹{lg.commission_amount?.toLocaleString() || 0}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedLeadGen(lg);
                  setShowAdvanceForm(false);
                }}
                className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg text-sm font-medium"
              >
                View Details
              </button>
            </div>

            {lg.added_by && (
              <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                Added by {lg.added_by.full_name}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredLeadGenerators.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No lead generators found</p>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">
                {editingLeadGen ? 'Edit Lead Generator' : 'Add Lead Generator'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Location Fields */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Location Details</h4>
                  <CascadingLocationSelector
                    stateId={formData.state_id}
                    districtId={formData.district_id}
                    constituencyId={formData.constituency_id}
                    mandalId={formData.mandal_id}
                    villageId={formData.village_id}
                    onChange={(location) => {
                      console.log('Location changed:', location);
                      setFormData({
                        ...formData,
                        state_id: location.stateId,
                        district_id: location.districtId,
                        constituency_id: location.constituencyId,
                        mandal_id: location.mandalId,
                        village_id: location.villageId,
                        state: location.stateName || formData.state,
                        district: location.districtName || formData.district,
                        mandal: location.mandalName || formData.mandal,
                        village: location.villageName || formData.village,
                      });
                    }}
                    showLabels={true}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode
                    </label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Commission Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.commission_amount}
                      onChange={(e) => setFormData({ ...formData, commission_amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingLeadGen(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingLeadGen ? 'Update' : 'Add'} Lead Generator
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedLeadGen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold">{selectedLeadGen.full_name}</h3>
                  <p className="text-gray-600">Lead Generator Details & Advances</p>
                </div>
                <button
                  onClick={() => setSelectedLeadGen(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{selectedLeadGen.customer_count}</div>
                  <div className="text-sm text-gray-600">Total Customers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    ₹{(selectedLeadGen.total_commission || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Commission</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    ₹{(selectedLeadGen.total_advances || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Advances</div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-lg">Advances History</h4>
                <button
                  onClick={() => setShowAdvanceForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Advance
                </button>
              </div>

              {showAdvanceForm && (
                <form onSubmit={handleAdvanceSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer (Optional)
                      </label>
                      <select
                        value={advanceFormData.customer_id}
                        onChange={(e) => setAdvanceFormData({ ...advanceFormData, customer_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Customer</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} - {c.application_ref_no}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount *
                      </label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={advanceFormData.amount}
                        onChange={(e) => setAdvanceFormData({ ...advanceFormData, amount: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={advanceFormData.payment_date}
                        onChange={(e) => setAdvanceFormData({ ...advanceFormData, payment_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Method *
                      </label>
                      <select
                        value={advanceFormData.payment_method}
                        onChange={(e) => setAdvanceFormData({ ...advanceFormData, payment_method: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="cash">Cash</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="upi">UPI</option>
                        <option value="cheque">Cheque</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reference Number
                      </label>
                      <input
                        type="text"
                        value={advanceFormData.reference_number}
                        onChange={(e) => setAdvanceFormData({ ...advanceFormData, reference_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={advanceFormData.notes}
                      onChange={(e) => setAdvanceFormData({ ...advanceFormData, notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdvanceForm(false);
                        resetAdvanceForm();
                      }}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add Advance
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-3">
                {advances.map((advance) => (
                  <div key={advance.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-2xl font-bold text-blue-600">
                            ₹{advance.amount.toLocaleString()}
                          </div>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                            {advance.payment_method.replace('_', ' ')}
                          </span>
                        </div>
                        {advance.customer && (
                          <div className="text-sm text-gray-600 mb-1">
                            For: {advance.customer.name} ({advance.customer.application_ref_no})
                          </div>
                        )}
                        {advance.reference_number && (
                          <div className="text-sm text-gray-600">
                            Ref: {advance.reference_number}
                          </div>
                        )}
                        {advance.notes && (
                          <div className="text-sm text-gray-600 mt-2">
                            {advance.notes}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">
                          {new Date(advance.payment_date).toLocaleDateString()}
                        </div>
                        {advance.given_by && (
                          <div className="text-xs text-gray-500 mt-1">
                            By {advance.given_by.full_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {advances.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No advances recorded yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LocationFilters({
  stateId,
  districtId,
  constituencyId,
  mandalId,
  villageId,
  onChange
}: {
  stateId?: number;
  districtId?: number;
  constituencyId?: number;
  mandalId?: number;
  villageId?: number;
  onChange: (filter: {
    stateId?: number;
    districtId?: number;
    constituencyId?: number;
    mandalId?: number;
    villageId?: number;
  }) => void;
}) {
  const { states } = useStates();
  const { districts } = useDistricts(stateId);
  const { constituencies } = useConstituencies(districtId);
  const { mandals } = useMandals(constituencyId);
  const { villages } = useVillages(mandalId);

  return (
    <div className="flex flex-wrap gap-4">
      <select
        value={stateId || ''}
        onChange={(e) => {
          const newStateId = e.target.value ? parseInt(e.target.value) : undefined;
          onChange({
            stateId: newStateId,
            districtId: undefined,
            constituencyId: undefined,
            mandalId: undefined,
            villageId: undefined
          });
        }}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
      >
        <option value="">All States</option>
        {states.map((state) => (
          <option key={state.id} value={state.id}>
            {state.name}
          </option>
        ))}
      </select>

      {stateId && (
        <select
          value={districtId || ''}
          onChange={(e) => {
            const newDistrictId = e.target.value ? parseInt(e.target.value) : undefined;
            onChange({
              stateId,
              districtId: newDistrictId,
              constituencyId: undefined,
              mandalId: undefined,
              villageId: undefined
            });
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Districts</option>
          {districts.map((district) => (
            <option key={district.id} value={district.id}>
              {district.name}
            </option>
          ))}
        </select>
      )}

      {districtId && constituencies.length > 0 && (
        <select
          value={constituencyId || ''}
          onChange={(e) => {
            const newConstituencyId = e.target.value ? parseInt(e.target.value) : undefined;
            onChange({
              stateId,
              districtId,
              constituencyId: newConstituencyId,
              mandalId: undefined,
              villageId: undefined
            });
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Constituencies</option>
          {constituencies.map((constituency) => (
            <option key={constituency.id} value={constituency.id}>
              {constituency.name}
            </option>
          ))}
        </select>
      )}

      {constituencyId && mandals.length > 0 && (
        <select
          value={mandalId || ''}
          onChange={(e) => {
            const newMandalId = e.target.value ? parseInt(e.target.value) : undefined;
            onChange({
              stateId,
              districtId,
              constituencyId,
              mandalId: newMandalId,
              villageId: undefined
            });
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Mandals</option>
          {mandals.map((mandal) => (
            <option key={mandal.id} value={mandal.id}>
              {mandal.name}
            </option>
          ))}
        </select>
      )}

      {mandalId && villages.length > 0 && (
        <select
          value={villageId || ''}
          onChange={(e) => {
            const newVillageId = e.target.value ? parseInt(e.target.value) : undefined;
            onChange({
              stateId,
              districtId,
              constituencyId,
              mandalId,
              villageId: newVillageId
            });
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Villages</option>
          {villages.map((village) => (
            <option key={village.id} value={village.id}>
              {village.name}
            </option>
          ))}
        </select>
      )}

      {(stateId || districtId || constituencyId || mandalId || villageId) && (
        <button
          onClick={() => onChange({})}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
