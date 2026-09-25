import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Save, Loader2, FileJson, ClipboardCopy, Check, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase, Customer } from '../../lib/supabase';

interface ExtendedCustomer extends Customer {
  panel_serial_numbers?: string[] | string;
  panel_quantity?: number;
  panel_make?: string;
  panel_type?: string;
  panel_wattage?: number;
  inverter_make?: string;
  inverter_serial_number?: string;
  inverter_capacity?: number;
  system_capacity?: number;
  eb_distribution?: string;
  eb_section?: string;
  latitude?: number;
  longitude?: number;
  consumer_number?: string;
  aadhar_number?: string;
  application_ref_no?: string;
  [key: string]: any;
}

interface CustomerTechnicalDetailsModalProps {
  customer: ExtendedCustomer;
  onClose: () => void;
  onUpdate: () => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function buildInitialFormData(customer: ExtendedCustomer) {
  return {
    system_capacity: customer.system_capacity ?? '',
    panel_quantity: customer.panel_quantity ?? 0,
    panel_make: customer.panel_make ?? '',
    panel_serial_numbers: customer.panel_serial_numbers ?? '',
    panel_type: customer.panel_type ?? '',
    panel_wattage: customer.panel_wattage ?? '',
    inverter_make: customer.inverter_make ?? '',
    inverter_serial_number: customer.inverter_serial_number ?? '',
    inverter_capacity: customer.inverter_capacity ?? '',
    eb_distribution: customer.eb_distribution ?? '',
    eb_section: customer.eb_section ?? '',
    latitude: customer.latitude ?? '',
    longitude: customer.longitude ?? '',
    consumer_number: customer.consumer_number ?? '',
    aadhar_number: customer.aadhar_number ?? '',
    application_ref_no: customer.application_ref_no ?? '',
    address: customer.address ?? '',
  };
}

export default function CustomerTechnicalDetailsModal({ customer, onClose, onUpdate }: CustomerTechnicalDetailsModalProps) {
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [copiedJSON, setCopiedJSON] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState<ExtendedCustomer>(customer);
  const [formData, setFormData] = useState(() => buildInitialFormData(customer));
  const [panelMakes, setPanelMakes] = useState<string[]>([]);
  const [inverterMakes, setInverterMakes] = useState<string[]>([]);
  const [makesLoading, setMakesLoading] = useState(true);

  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);
  const saveStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setMakesLoading(true);
        const [panelRes, inverterRes] = await Promise.all([
          supabase.from('pv_module_makes').select('make_name, is_active').eq('is_active', true).order('make_name'),
          supabase.from('inverter_makes').select('make_name, is_active').eq('is_active', true).order('make_name'),
        ]);
        if (!mounted) return;
        if (panelRes.error) throw panelRes.error;
        if (inverterRes.error) throw inverterRes.error;
        setPanelMakes((panelRes.data || []).map((r: { make_name: string }) => r.make_name));
        setInverterMakes((inverterRes.data || []).map((r: { make_name: string }) => r.make_name));
      } catch (error) {
        console.error('Error loading makes:', error);
      } finally {
        if (mounted) setMakesLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const refreshFromDb = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customer.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return;
      const fresh = data as ExtendedCustomer;
      setCurrentCustomer(fresh);
      setFormData(prev => {
        const next = buildInitialFormData(fresh);
        (Object.keys(next) as (keyof typeof next)[]).forEach(key => {
          const dbVal = next[key];
          if (dbVal === '' || dbVal === 0 || dbVal === null || dbVal === undefined) {
            (next as any)[key] = prev[key];
          }
        });
        return next;
      });
    } catch (error) {
      console.error('Error refreshing customer from DB:', error);
    }
  }, [customer.id]);

  useEffect(() => {
    isInitialLoadRef.current = true;
    const timer = setTimeout(() => { isInitialLoadRef.current = false; }, 300);
    return () => clearTimeout(timer);
  }, []);

  const autoSave = useCallback(async (dataToSave: typeof formData) => {
    setSaving(true);
    setSaveState('saving');

    try {
      const parseNumeric = (value: string | number | undefined): number | null => {
        if (value === undefined || value === null || value === '') return null;
        const parsed = typeof value === 'number' ? value : parseFloat(String(value));
        return isNaN(parsed) ? null : parsed;
      };

      const updateData: Record<string, unknown> = {
        system_capacity: parseNumeric(dataToSave.system_capacity),
        panel_quantity: typeof dataToSave.panel_quantity === 'number' ? dataToSave.panel_quantity : (parseInt(String(dataToSave.panel_quantity)) || null),
        panel_make: dataToSave.panel_make || null,
        panel_serial_numbers: dataToSave.panel_serial_numbers || '',
        panel_type: dataToSave.panel_type || null,
        panel_wattage: parseNumeric(dataToSave.panel_wattage),
        inverter_make: dataToSave.inverter_make || null,
        inverter_serial_number: dataToSave.inverter_serial_number || null,
        inverter_capacity: parseNumeric(dataToSave.inverter_capacity),
        eb_distribution: dataToSave.eb_distribution || null,
        eb_section: dataToSave.eb_section || null,
        latitude: parseNumeric(dataToSave.latitude),
        longitude: parseNumeric(dataToSave.longitude),
        consumer_number: dataToSave.consumer_number || null,
        aadhar_number: dataToSave.aadhar_number || null,
        application_ref_no: dataToSave.application_ref_no || null,
        address: dataToSave.address || null,
      };

      const { error } = await supabase.from('customers').update(updateData).eq('id', customer.id);
      if (error) throw error;

      isDirtyRef.current = false;
      setSaveState('saved');
      setCurrentCustomer(prev => ({ ...prev, ...updateData }) as ExtendedCustomer);

      if (saveStateTimerRef.current) clearTimeout(saveStateTimerRef.current);
      saveStateTimerRef.current = setTimeout(() => setSaveState('idle'), 2000);
    } catch (error: any) {
      console.error('Error auto-saving technical details:', error);
      setSaveState('error');
    } finally {
      setSaving(false);
    }
  }, [customer.id]);

  const flushPendingSave = useCallback(() => {
    if (!isDirtyRef.current) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    isDirtyRef.current = false;
    autoSave(formDataRef.current);
  }, [autoSave]);

  const scheduleAutoSave = useCallback((newData: typeof formData) => {
    if (isInitialLoadRef.current) return;
    isDirtyRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      isDirtyRef.current = false;
      autoSave(newData);
    }, 800);
  }, [autoSave]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSave();
      } else if (document.visibilityState === 'visible' && !isDirtyRef.current && !saving) {
        refreshFromDb();
      }
    };
    const handleBeforeUnload = () => {
      flushPendingSave();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      flushPendingSave();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (saveStateTimerRef.current) clearTimeout(saveStateTimerRef.current);
    };
  }, [flushPendingSave]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: name === 'panel_quantity' ? (parseInt(value) || 0) : value,
      };
      scheduleAutoSave(updated);
      return updated;
    });
  };

  const handleManualSave = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    isDirtyRef.current = false;
    await autoSave(formDataRef.current);
    onUpdateRef.current();
  };

  const handleClose = async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (isDirtyRef.current) {
      isDirtyRef.current = false;
      await autoSave(formDataRef.current);
    }
    onUpdateRef.current();
    onClose();
  };

  const buildProjectData = () => ({
    customer_name: currentCustomer.customer_name || '',
    consumer_no: formData.consumer_number || '',
    address: formData.address || '',
    application_ref: formData.application_ref_no || '',
    capacity: formData.system_capacity || '',
    project_capacity_kw: formData.system_capacity ? parseFloat(String(formData.system_capacity)) : 0,
    total_watts: formData.system_capacity ? parseFloat(String(formData.system_capacity)) * 1000 : 0,
    panel_number: formData.panel_quantity || 0,
    panel_make: formData.panel_make || '',
    panel_serial_numbers: formData.panel_serial_numbers || '',
    eb_distribution: formData.eb_distribution || '',
    eb_section: formData.eb_section || '',
    latitude: formData.latitude || '',
    longitude: formData.longitude || '',
    mobile_number: currentCustomer.phone || '',
    inverter_make: formData.inverter_make || '',
    inverter_serial_number: formData.inverter_serial_number || '',
    inverter_capacity: formData.inverter_capacity || '',
    module_make: formData.panel_make || '',
    module_type: formData.panel_type || '',
    module_capacity: formData.panel_wattage || '',
    number_of_modules: formData.panel_quantity || 0,
    plant_capacity: formData.system_capacity ? parseFloat(String(formData.system_capacity)) * 1000 : 0,
    plant_capacity_in_kw: formData.system_capacity ? parseFloat(String(formData.system_capacity)) : 0,
    aadhar_number: formData.aadhar_number || '',
  });

  const downloadJSON = () => {
    const projectData = buildProjectData();
    const jsonString = JSON.stringify(projectData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentCustomer.customer_name.replace(/\s+/g, '_')}_${currentCustomer.application_ref_no || 'customer'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyJSON = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildProjectData(), null, 2));
      setCopiedJSON(true);
      setTimeout(() => setCopiedJSON(false), 2000);
    } catch {}
  };

  const renderSaveIndicator = () => {
    if (saveState === 'saving') {
      return (
        <span className="flex items-center gap-1.5 text-sm text-blue-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving...
        </span>
      );
    }
    if (saveState === 'saved') {
      return (
        <span className="flex items-center gap-1.5 text-sm text-green-600">
          <CheckCircle2 className="w-4 h-4" />
          Saved
        </span>
      );
    }
    if (saveState === 'error') {
      return (
        <span className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" />
          Save failed
        </span>
      );
    }
    return null;
  };

  const renderMakeOptions = (makes: string[], currentValue: string) => {
    const options: React.ReactNode[] = [
      <option key="empty" value="">Select make</option>,
    ];
    const seen = new Set<string>();
    makes.forEach(make => {
      if (!seen.has(make)) {
        seen.add(make);
        options.push(<option key={make} value={make}>{make}</option>);
      }
    });
    if (currentValue && !seen.has(currentValue)) {
      options.push(<option key={currentValue} value={currentValue}>{currentValue} (not in master list)</option>);
    }
    options.push(<option key="Other" value="Other">Other</option>);
    return options;
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Technical Details</h2>
            <p className="text-sm text-gray-600 mt-1">{customer.customer_name}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="mr-1 min-w-[80px]">{renderSaveIndicator()}</div>
            <button
              onClick={copyJSON}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              title="Copy JSON to clipboard"
            >
              {copiedJSON ? <Check className="w-5 h-5 text-green-600" /> : <ClipboardCopy className="w-5 h-5" />}
              {copiedJSON ? 'Copied!' : 'Copy JSON'}
            </button>
            <button
              onClick={downloadJSON}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Download JSON"
            >
              <FileJson className="w-5 h-5" />
              Download JSON
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Consumer Number</label>
                  <input type="text" name="consumer_number" value={formData.consumer_number} onChange={handleChange} className={inputClass} placeholder="Enter consumer number" />
                </div>
                <div>
                  <label className={labelClass}>Application Ref No</label>
                  <input type="text" name="application_ref_no" value={formData.application_ref_no} onChange={handleChange} className={inputClass} placeholder="Enter application reference" />
                </div>
                <div>
                  <label className={labelClass}>System Capacity (kW)</label>
                  <input type="text" name="system_capacity" value={formData.system_capacity} onChange={handleChange} className={inputClass} placeholder="e.g., 5.0" />
                </div>
                <div>
                  <label className={labelClass}>Aadhaar Number</label>
                  <input type="text" name="aadhar_number" value={formData.aadhar_number} onChange={handleChange} className={inputClass} placeholder="Enter aadhaar number" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Address</label>
                  <textarea name="address" value={formData.address} onChange={handleChange} rows={3} className={inputClass} placeholder="Enter customer address" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Solar Panel Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Panel Make <span className="text-red-500">*</span></label>
                  <select
                    name="panel_make"
                    value={formData.panel_make}
                    onChange={handleChange}
                    className={inputClass}
                    disabled={makesLoading}
                  >
                    {makesLoading ? (
                      <option value="">Loading...</option>
                    ) : renderMakeOptions(panelMakes, formData.panel_make)}
                  </select>
                  {panelMakes.length === 0 && !makesLoading && (
                    <p className="mt-1 text-xs text-amber-600">
                      No panel makes configured. Add them in Settings &gt; Master Data.
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Panel Type</label>
                  <input type="text" name="panel_type" value={formData.panel_type} onChange={handleChange} className={inputClass} placeholder="e.g., Monocrystalline, Polycrystalline" />
                </div>
                <div>
                  <label className={labelClass}>Panel Wattage (W)</label>
                  <input type="text" name="panel_wattage" value={formData.panel_wattage} onChange={handleChange} className={inputClass} placeholder="e.g., 540" />
                </div>
                <div>
                  <label className={labelClass}>Number of Panels</label>
                  <input type="number" name="panel_quantity" value={formData.panel_quantity} onChange={handleChange} className={inputClass} placeholder="e.g., 10" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Panel Serial Numbers</label>
                  <textarea name="panel_serial_numbers" value={formData.panel_serial_numbers} onChange={handleChange} rows={3} className={inputClass} placeholder="Enter serial numbers (comma separated)" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Inverter Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Inverter Make <span className="text-red-500">*</span></label>
                  <select
                    name="inverter_make"
                    value={formData.inverter_make}
                    onChange={handleChange}
                    className={inputClass}
                    disabled={makesLoading}
                  >
                    {makesLoading ? (
                      <option value="">Loading...</option>
                    ) : renderMakeOptions(inverterMakes, formData.inverter_make)}
                  </select>
                  {inverterMakes.length === 0 && !makesLoading && (
                    <p className="mt-1 text-xs text-amber-600">
                      No inverter makes configured. Add them in Settings &gt; Master Data.
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Inverter Capacity (kW)</label>
                  <input type="text" name="inverter_capacity" value={formData.inverter_capacity} onChange={handleChange} className={inputClass} placeholder="e.g., 5.0" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Inverter Serial Number</label>
                  <input type="text" name="inverter_serial_number" value={formData.inverter_serial_number} onChange={handleChange} className={inputClass} placeholder="Enter inverter serial number" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Electricity Board Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>EB Distribution</label>
                  <input type="text" name="eb_distribution" value={formData.eb_distribution} onChange={handleChange} className={inputClass} placeholder="Enter EB distribution" />
                </div>
                <div>
                  <label className={labelClass}>EB Section</label>
                  <input type="text" name="eb_section" value={formData.eb_section} onChange={handleChange} className={inputClass} placeholder="Enter EB section" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Latitude</label>
                  <input type="text" name="latitude" value={formData.latitude} onChange={handleChange} className={inputClass} placeholder="e.g., 13.0827" />
                </div>
                <div>
                  <label className={labelClass}>Longitude</label>
                  <input type="text" name="longitude" value={formData.longitude} onChange={handleChange} className={inputClass} placeholder="e.g., 80.2707" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end items-center">
          <span className="text-sm text-gray-500 mr-auto">Changes auto-save as you type</span>
          <button
            type="button"
            onClick={handleClose}
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleManualSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save & Sync
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
