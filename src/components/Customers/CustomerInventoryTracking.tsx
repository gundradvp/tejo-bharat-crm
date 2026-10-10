import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { 
  Package, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Truck, 
  AlertCircle, 
  Loader2, 
  Printer, 
  Copy, 
  Check, 
  Layers, 
  Sun, 
  Zap, 
  X,
  IndianRupee,
  FileText
} from 'lucide-react';
import { 
  getCustomerInventoryAllocations, 
  getTenantItems, 
  dispatchInventoryToCustomer, 
  updateAllocationStatus, 
  deleteCustomerAllocation 
} from '../../lib/inventoryApi';
import type { CustomerInventoryAllocation } from '../../lib/supabase';

interface CustomerInventoryTrackingProps {
  customerId: string;
  customerName?: string;
  onStockChanged?: () => void;
}

export default function CustomerInventoryTracking({ customerId, customerName, onStockChanged }: CustomerInventoryTrackingProps) {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  const [allocations, setAllocations] = useState<CustomerInventoryAllocation[]>([]);
  const [tenantItems, setTenantItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copiedSerial, setCopiedSerial] = useState<string | null>(null);

  // Form State
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [customItemName, setCustomItemName] = useState<string>('');
  const [category, setCategory] = useState<string>('Solar Panels');
  const [quantity, setQuantity] = useState<number>(1);
  const [measuringUnit, setMeasuringUnit] = useState<string>('PCS');
  const [unitCost, setUnitCost] = useState<number>(0);
  const [serialNumbers, setSerialNumbers] = useState<string>('');
  const [dispatchDate, setDispatchDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [challanNumber, setChallanNumber] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [syncToExpenses, setSyncToExpenses] = useState<boolean>(true);
  const [formError, setFormError] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [customerId, currentTenant]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allocsData, itemsData] = await Promise.all([
        getCustomerInventoryAllocations(customerId),
        currentTenant ? getTenantItems(currentTenant.id) : Promise.resolve([])
      ]);
      setAllocations(allocsData);
      setTenantItems(itemsData);
    } catch (err) {
      console.error('Error loading inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    if (!itemId) {
      setCustomItemName('');
      setUnitCost(0);
      return;
    }
    const found = tenantItems.find(i => i.id === itemId);
    if (found) {
      setCustomItemName(found.item_name);
      setCategory(found.category || 'General');
      setMeasuringUnit(found.measuring_unit || 'PCS');
      setUnitCost(found.sales_price || 0);
    }
  };

  const handleDispatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    const finalItemName = selectedItemId 
      ? (tenantItems.find(i => i.id === selectedItemId)?.item_name || customItemName) 
      : customItemName;

    if (!finalItemName.trim()) {
      setFormError('Please select or specify an item name.');
      return;
    }

    if (quantity <= 0) {
      setFormError('Quantity must be greater than 0.');
      return;
    }

    // Check available stock if an item is selected from master catalog
    if (selectedItemId) {
      const itemInCatalog = tenantItems.find(i => i.id === selectedItemId);
      if (itemInCatalog && Number(itemInCatalog.opening_stock) < quantity) {
        if (!confirm(`Warning: Current stock for "${itemInCatalog.item_name}" is only ${itemInCatalog.opening_stock} ${itemInCatalog.measuring_unit}. Proceeding will reduce stock to 0 or negative. Continue?`)) {
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      setFormError('');
      await dispatchInventoryToCustomer({
        customerId,
        tenantId: currentTenant.id,
        userId: user?.id,
        itemId: selectedItemId || null,
        itemName: finalItemName.trim(),
        category,
        quantity,
        measuringUnit,
        unitCost,
        serialNumbers: serialNumbers.trim(),
        dispatchDate,
        challanNumber: challanNumber.trim(),
        remarks: remarks.trim(),
        syncToExpenses,
      });

      setShowModal(false);
      resetForm();
      await loadData();
      onStockChanged?.();
    } catch (err: any) {
      console.error('Failed to dispatch inventory:', err);
      setFormError(err.message || 'Failed to dispatch inventory');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedItemId('');
    setCustomItemName('');
    setCategory('Solar Panels');
    setQuantity(1);
    setMeasuringUnit('PCS');
    setUnitCost(0);
    setSerialNumbers('');
    setDispatchDate(new Date().toISOString().split('T')[0]);
    setChallanNumber('');
    setRemarks('');
    setSyncToExpenses(true);
    setFormError('');
  };

  const handleStatusChange = async (allocation: CustomerInventoryAllocation, newStatus: 'dispatched' | 'installed' | 'returned') => {
    try {
      await updateAllocationStatus(allocation.id, newStatus, allocation);
      await loadData();
      onStockChanged?.();
    } catch (err: any) {
      console.error('Failed to update status:', err);
      alert('Error updating status: ' + err.message);
    }
  };

  const handleDelete = async (allocation: CustomerInventoryAllocation) => {
    if (!confirm(`Are you sure you want to delete this dispatch (${allocation.quantity} ${allocation.measuring_unit} of ${allocation.item_name})? The stock will be restored to your warehouse inventory.`)) {
      return;
    }

    try {
      await deleteCustomerAllocation(allocation);
      await loadData();
      onStockChanged?.();
    } catch (err: any) {
      console.error('Failed to delete allocation:', err);
      alert('Error deleting allocation: ' + err.message);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSerial(id);
    setTimeout(() => setCopiedSerial(null), 2000);
  };

  const handlePrintChallan = () => {
    window.print();
  };

  // Calculations
  const activeAllocations = allocations.filter(a => a.status !== 'returned');
  const totalMaterialCost = activeAllocations.reduce((sum, a) => sum + (a.total_cost || 0), 0);
  const totalPanelsCount = activeAllocations
    .filter(a => a.category?.toLowerCase().includes('panel') || a.item_name.toLowerCase().includes('panel') || a.item_name.toLowerCase().includes('module'))
    .reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);
  const totalInvertersCount = activeAllocations
    .filter(a => a.category?.toLowerCase().includes('inverter') || a.item_name.toLowerCase().includes('inverter'))
    .reduce((sum, a) => sum + (Number(a.quantity) || 0), 0);

  const selectedItemObject = tenantItems.find(i => i.id === selectedItemId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-teal-600" />
            Customer Material & Inventory Tracking
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Dispatch equipment from warehouse stock, track serial numbers, and auto-deduct inventory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allocations.length > 0 && (
            <button
              onClick={handlePrintChallan}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              title="Print Delivery Challan"
            >
              <Printer className="w-4 h-4" />
              Print Slip
            </button>
          )}
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Dispatch Material to Site
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-teal-50 to-teal-100/40 border border-teal-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">Total Dispatches</span>
            <Layers className="w-4 h-4 text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-teal-900 mt-2">{activeAllocations.length} items</p>
          <p className="text-xs text-teal-600 mt-0.5">{allocations.filter(a => a.status === 'returned').length} returned</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100/40 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Solar Panels</span>
            <Sun className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-2">{totalPanelsCount} Units</p>
          <p className="text-xs text-blue-600 mt-0.5">Deducted from stock</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/40 border border-purple-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Inverters</span>
            <Zap className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-900 mt-2">{totalInvertersCount} Units</p>
          <p className="text-xs text-purple-600 mt-0.5">Deducted from stock</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Material Cost</span>
            <IndianRupee className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-900 mt-2">₹{totalMaterialCost.toLocaleString('en-IN')}</p>
          <p className="text-xs text-amber-600 mt-0.5">Site Material Value</p>
        </div>
      </div>

      {/* Dispatched Inventory Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide">
            <Truck className="w-4 h-4 text-teal-600" />
            Dispatched Material & Serial Number Register
          </h4>
          <span className="text-xs text-gray-500 font-medium">
            {allocations.length} records
          </span>
        </div>

        {allocations.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No materials dispatched to this customer yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Click "Dispatch Material to Site" to allocate solar equipment and automatically update warehouse stock.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Item & Category</th>
                  <th className="py-3 px-4 text-center">Quantity</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Total Cost</th>
                  <th className="py-3 px-4">Serial Numbers</th>
                  <th className="py-3 px-4">DC / Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {allocations.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900">{alloc.item_name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium text-[10px]">
                          {alloc.category || 'General'}
                        </span>
                        {alloc.expense_id && (
                          <span className="text-green-600 text-[10px] font-medium flex items-center gap-0.5">
                            <FileText className="w-3 h-3" /> Cost Linked
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold text-gray-900 text-base">{alloc.quantity}</span>
                      <span className="text-xs text-gray-500 ml-1">{alloc.measuring_unit}</span>
                    </td>

                    <td className="py-3.5 px-4 text-right text-gray-700">
                      ₹{(alloc.unit_cost || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 text-right font-semibold text-gray-900">
                      ₹{(alloc.total_cost || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      {alloc.serial_numbers ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded border border-gray-200 truncate max-w-[180px]" title={alloc.serial_numbers}>
                            {alloc.serial_numbers}
                          </span>
                          <button
                            onClick={() => copyToClipboard(alloc.serial_numbers!, alloc.id)}
                            className="p-1 text-gray-400 hover:text-teal-600 transition-colors"
                            title="Copy serial numbers"
                          >
                            {copiedSerial === alloc.id ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">No serial recorded</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-gray-600">
                      <div className="font-medium text-gray-800">
                        {alloc.challan_number ? `DC: ${alloc.challan_number}` : 'Direct'}
                      </div>
                      <div className="text-gray-500 mt-0.5">
                        {new Date(alloc.dispatch_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <select
                        value={alloc.status}
                        onChange={(e) => handleStatusChange(alloc, e.target.value as any)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer ${
                          alloc.status === 'installed'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : alloc.status === 'returned'
                            ? 'bg-gray-100 text-gray-600 border-gray-300'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        <option value="dispatched">📦 Dispatched</option>
                        <option value="installed">⚡ Installed</option>
                        <option value="returned">🔄 Returned (Restores Stock)</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(alloc)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete allocation & restore stock"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dispatch Material Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-teal-50/50">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-700" />
                <h3 className="text-lg font-bold text-gray-900">
                  Dispatch Inventory to {customerName || 'Customer Site'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              {/* Master Inventory Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Select Item from Warehouse Inventory
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => handleItemSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                >
                  <option value="">-- Choose from Master Catalog (or enter custom below) --</option>
                  {tenantItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.item_name} ({item.category || 'General'}) — Available Stock: {item.opening_stock} {item.measuring_unit} @ ₹{item.sales_price}
                    </option>
                  ))}
                </select>

                {selectedItemObject && (
                  <div className="mt-2 p-2.5 bg-teal-50 border border-teal-100 rounded-lg text-xs text-teal-800 flex items-center justify-between">
                    <span>
                      Warehouse Stock Available: <strong>{selectedItemObject.opening_stock} {selectedItemObject.measuring_unit}</strong>
                    </span>
                    <span className="font-semibold">
                      Stock will reduce to: {Math.max(0, Number(selectedItemObject.opening_stock) - quantity)} {selectedItemObject.measuring_unit}
                    </span>
                  </div>
                )}
              </div>

              {/* Custom Item Name if not in list */}
              {!selectedItemId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      value={customItemName}
                      onChange={(e) => setCustomItemName(e.target.value)}
                      placeholder="e.g. Waaree 540W Mono PERC"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                      required={!selectedItemId}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    >
                      <option value="Solar Panels">Solar Panels</option>
                      <option value="Inverters">Inverters</option>
                      <option value="Structure & Hardware">Structure & Hardware</option>
                      <option value="BOS & Electricals">BOS & Electricals</option>
                      <option value="Cables & Wires">Cables & Wires</option>
                      <option value="Earthing & Lightning">Earthing & Lightning</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Quantity, Unit, Unit Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity to Dispatch *
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={measuringUnit}
                    onChange={(e) => setMeasuringUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  >
                    <option value="PCS">Pieces (PCS)</option>
                    <option value="NOS">Numbers (NOS)</option>
                    <option value="KW">Kilowatts (KW)</option>
                    <option value="M">Meters (M)</option>
                    <option value="SET">Set (SET)</option>
                    <option value="KG">Kilograms (KG)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Cost (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Total Calculation Display */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-center justify-between text-sm">
                <span className="text-gray-600 font-medium">Total Material Dispatch Value:</span>
                <span className="text-lg font-bold text-teal-800">
                  ₹{(quantity * (unitCost || 0)).toLocaleString('en-IN')}
                </span>
              </div>

              {/* Serial Numbers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Numbers (Panels / Inverter Barcodes)
                </label>
                <textarea
                  value={serialNumbers}
                  onChange={(e) => setSerialNumbers(e.target.value)}
                  placeholder="e.g. W540-001, W540-002, W540-003 or paste barcode scan list"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Separate serials with commas or newlines</p>
              </div>

              {/* Delivery Challan & Dispatch Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Challan / DC #
                  </label>
                  <input
                    type="text"
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    placeholder="e.g. DC-2026-084"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dispatch Date
                  </label>
                  <input
                    type="date"
                    value={dispatchDate}
                    onChange={(e) => setDispatchDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Auto Sync to Project Expenses */}
              <div className="pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={syncToExpenses}
                    onChange={(e) => setSyncToExpenses(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Record this material cost into Customer Project Expenses
                    </span>
                    <p className="text-xs text-gray-500">
                      Auto-creates an entry in the Expense Tracker for project profitability calculations.
                    </p>
                  </div>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm text-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deducting Stock & Dispatching...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm Dispatch & Reduce Stock
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
