import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { Plus, Pencil, Trash2, X, Loader2, Network, Search } from 'lucide-react';

interface Incharge {
  id: string;
  tenant_id: string;
  user_id: string | null;
  name: string;
  mobile: string | null;
  level: string;
  location_id: string | null;
  assembly_id: number | null;
  mandal_name: string | null;
  panchayat_name: string | null;
  booth_number: string | null;
  ward_no: string | null;
  is_active: boolean;
  notes: string | null;
  assigned_at: string;
}

const LEVELS = ['parliament', 'assembly', 'mandal', 'panchayat', 'booth', 'ward'] as const;
type Level = typeof LEVELS[number];

const LEVEL_BADGES: Record<string, string> = {
  parliament: 'bg-purple-100 text-purple-700',
  assembly: 'bg-blue-100 text-blue-700',
  mandal: 'bg-green-100 text-green-700',
  panchayat: 'bg-amber-100 text-amber-700',
  booth: 'bg-orange-100 text-orange-700',
  ward: 'bg-teal-100 text-teal-700',
};

const LEVEL_SHOWS: Record<Level, { assembly: boolean; mandal: boolean; panchayat: boolean; booth: boolean; ward: boolean }> = {
  parliament: { assembly: false, mandal: false, panchayat: false, booth: false, ward: false },
  assembly: { assembly: true, mandal: false, panchayat: false, booth: false, ward: false },
  mandal: { assembly: true, mandal: true, panchayat: false, booth: false, ward: false },
  panchayat: { assembly: true, mandal: true, panchayat: true, booth: false, ward: false },
  booth: { assembly: true, mandal: true, panchayat: true, booth: true, ward: false },
  ward: { assembly: true, mandal: true, panchayat: true, booth: false, ward: true },
};

export default function InchargeManagement() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [incharges, setIncharges] = useState<Incharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Incharge | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    level: 'assembly' as Level,
    assembly_id: '',
    mandal_name: '',
    panchayat_name: '',
    booth_number: '',
    ward_no: '',
    notes: '',
    is_active: true,
  });

  const fetchIncharges = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jsp_incharges')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      setIncharges((data || []) as Incharge[]);
    } catch (err) {
      console.error('Fetch incharges error:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchIncharges();
  }, [fetchIncharges]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: '', mobile: '', level: 'assembly', assembly_id: '', mandal_name: '',
      panchayat_name: '', booth_number: '', ward_no: '', notes: '', is_active: true,
    });
    setShowModal(true);
  };

  const openEdit = (inc: Incharge) => {
    setEditing(inc);
    setForm({
      name: inc.name,
      mobile: inc.mobile || '',
      level: inc.level as Level,
      assembly_id: inc.assembly_id?.toString() || '',
      mandal_name: inc.mandal_name || '',
      panchayat_name: inc.panchayat_name || '',
      booth_number: inc.booth_number || '',
      ward_no: inc.ward_no || '',
      notes: inc.notes || '',
      is_active: inc.is_active,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!tenantId || !form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        tenant_id: tenantId,
        name: form.name.trim(),
        mobile: form.mobile.trim() || null,
        level: form.level,
        assembly_id: form.assembly_id ? parseInt(form.assembly_id) : null,
        mandal_name: form.mandal_name.trim() || null,
        panchayat_name: form.panchayat_name.trim() || null,
        booth_number: form.booth_number.trim() || null,
        ward_no: form.ward_no.trim() || null,
        notes: form.notes.trim() || null,
        is_active: form.is_active,
      };

      if (editing) {
        const { error } = await supabase
          .from('jsp_incharges')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('jsp_incharges')
          .insert(payload);
        if (error) throw error;
      }

      setShowModal(false);
      fetchIncharges();
    } catch (err) {
      console.error('Save incharge error:', err);
      alert('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from('jsp_incharges').delete().eq('id', deleteId);
      if (error) throw error;
      setDeleteId(null);
      fetchIncharges();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const shows = LEVEL_SHOWS[form.level];
  const filtered = incharges.filter((inc) => {
    if (levelFilter && inc.level !== levelFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        inc.name.toLowerCase().includes(q) ||
        (inc.mobile || '').includes(q) ||
        (inc.mandal_name || '').toLowerCase().includes(q) ||
        (inc.panchayat_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400";
  const selectClass = inputClass + " appearance-none";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center">
            <Network className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Incharge Management</h1>
            <p className="text-sm text-gray-500">{incharges.length} incharges total</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Incharge
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, mobile, mandal, panchayat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
          />
        </div>
        <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className={`${selectClass} sm:w-48`}>
          <option value="">All Levels</option>
          {LEVELS.map((l) => <option key={l} value={l} className="capitalize">{l}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Network className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No incharges found</p>
            <p className="text-sm text-gray-400 mt-1">Click "Add Incharge" to create one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-3 font-semibold text-gray-500">Name</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-500 hidden md:table-cell">Mobile</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-500">Level</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-500 hidden lg:table-cell">Assembly</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-500 hidden lg:table-cell">Mandal</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-500 hidden xl:table-cell">Panchayat</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-500 hidden xl:table-cell">Booth/Ward</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-500">Status</th>
                  <th className="text-left py-3 px-3 font-semibold text-gray-500 hidden md:table-cell">Assigned</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inc) => (
                  <tr key={inc.id} className="border-b border-gray-50 hover:bg-amber-50/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-gray-900">{inc.name}</td>
                    <td className="py-2.5 px-3 text-gray-600 hidden md:table-cell">{inc.mobile || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${LEVEL_BADGES[inc.level] || 'bg-gray-100 text-gray-600'}`}>
                        {inc.level}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 hidden lg:table-cell">{inc.assembly_id || '—'}</td>
                    <td className="py-2.5 px-3 text-gray-600 hidden lg:table-cell">{inc.mandal_name || '—'}</td>
                    <td className="py-2.5 px-3 text-gray-600 hidden xl:table-cell">{inc.panchayat_name || '—'}</td>
                    <td className="py-2.5 px-3 text-gray-600 hidden xl:table-cell">
                      {[inc.booth_number, inc.ward_no].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${inc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {inc.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 hidden md:table-cell">
                      {inc.assigned_at ? new Date(inc.assigned_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(inc)}
                          className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(inc.id)}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg pointer-events-auto max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-amber-500 text-white px-5 py-4 flex items-center justify-between z-10">
                <h3 className="font-bold text-lg">{editing ? 'Edit Incharge' : 'Add Incharge'}</h3>
                <button onClick={() => setShowModal(false)} className="p-1 hover:bg-amber-600 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputClass}
                    placeholder="Full name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mobile</label>
                  <input
                    type="text"
                    value={form.mobile}
                    onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                    className={inputClass}
                    placeholder="Contact number"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Level</label>
                  <select
                    value={form.level}
                    onChange={(e) => setForm({ ...form, level: e.target.value as Level })}
                    className={selectClass}
                  >
                    {LEVELS.map((l) => <option key={l} value={l} className="capitalize">{l}</option>)}
                  </select>
                </div>

                {shows.assembly && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Assembly ID</label>
                    <input
                      type="number"
                      value={form.assembly_id}
                      onChange={(e) => setForm({ ...form, assembly_id: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. 37"
                    />
                  </div>
                )}

                {shows.mandal && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mandal</label>
                    <input
                      type="text"
                      value={form.mandal_name}
                      onChange={(e) => setForm({ ...form, mandal_name: e.target.value })}
                      className={inputClass}
                      placeholder="Mandal name"
                    />
                  </div>
                )}

                {shows.panchayat && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Panchayat</label>
                    <input
                      type="text"
                      value={form.panchayat_name}
                      onChange={(e) => setForm({ ...form, panchayat_name: e.target.value })}
                      className={inputClass}
                      placeholder="Panchayat name"
                    />
                  </div>
                )}

                {shows.booth && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Booth Number</label>
                    <input
                      type="text"
                      value={form.booth_number}
                      onChange={(e) => setForm({ ...form, booth_number: e.target.value })}
                      className={inputClass}
                      placeholder="Booth number"
                    />
                  </div>
                )}

                {shows.ward && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Ward No</label>
                    <input
                      type="text"
                      value={form.ward_no}
                      onChange={(e) => setForm({ ...form, ward_no: e.target.value })}
                      className={inputClass}
                      placeholder="Ward number"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className={inputClass}
                    rows={2}
                    placeholder="Optional notes"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={!form.name.trim() || saving}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {editing ? 'Save Changes' : 'Add Incharge'}
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setDeleteId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm pointer-events-auto">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="font-bold text-gray-900">Delete Incharge?</h3>
                </div>
                <p className="text-sm text-gray-500 mb-4">This action cannot be undone.</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeleteId(null)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
