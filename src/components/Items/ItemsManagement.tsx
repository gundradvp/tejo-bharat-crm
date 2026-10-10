import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Search,
  Building2,
  Calendar,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Package,
  Boxes,
  Zap,
  Tag,
  Filter,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  List,
  LayoutGrid
} from 'lucide-react';

interface Item {
  id: string;
  item_type: string;
  item_name: string;
  category: string;
  description: string;
  specifications: string;
  sales_price: number;
  tax_rate: number;
  measuring_unit: string;
  opening_stock: number;
  show_in_online_store: boolean;
}

function parseItemMeta(item: Item) {
  let seller = '';
  let purchaseDate = '';
  let oemCode = '';
  let wattage = 0;
  let serialCount = 0;
  let serialNumbers: string[] = [];

  if (item.specifications) {
    try {
      const parsed = typeof item.specifications === 'string' ? JSON.parse(item.specifications) : item.specifications;
      seller = parsed.seller_name || '';
      purchaseDate = parsed.purchase_date || '';
      oemCode = parsed.oem_item_code || '';
      wattage = parsed.wattage_wp || 0;
      serialNumbers = parsed.serial_numbers || [];
      serialCount = parsed.serial_numbers_count || serialNumbers.length;
    } catch {}
  }
  if (!seller && item.description && item.description.includes('Seller:')) {
    const match = item.description.match(/Seller:\s*([^|]+)/i);
    if (match) seller = match[1].trim();
  }
  if (!purchaseDate && item.description && item.description.includes('Purchase Date:')) {
    const match = item.description.match(/Purchase Date:\s*([^|]+)/i);
    if (match) purchaseDate = match[1].trim();
  }

  const stockValue = (item.opening_stock || 0) * (item.sales_price || 0);
  const totalCapacityKwp = wattage > 0 ? ((wattage * (item.opening_stock || 0)) / 1000) : 0;

  return { seller, purchaseDate, oemCode, wattage, serialCount, serialNumbers, stockValue, totalCapacityKwp };
}

type SortField = 'item_name' | 'category' | 'seller' | 'purchase_date' | 'opening_stock' | 'sales_price' | 'stock_value' | 'capacity';
type SortDirection = 'asc' | 'desc';

export default function ItemsManagement() {
  const { currentTenant } = useTenant();
  const { isAdmin } = useAuth();
  const isAdminUser = isAdmin();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [activeTab, setActiveTab] = useState('basic');

  // View & Filter States
  const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeller, setSelectedSeller] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [sortField, setSortField] = useState<SortField>('item_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Serial Numbers Viewer Modal
  const [viewingSerialsItem, setViewingSerialsItem] = useState<{ name: string; serials: string[] } | null>(null);
  const [copiedSerials, setCopiedSerials] = useState(false);
  const [serialSearchTerm, setSerialSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    item_type: 'product',
    item_name: '',
    category: '',
    seller_name: '',
    purchase_date: '',
    description: '',
    specifications: '',
    sales_price: 0,
    tax_rate: 12,
    measuring_unit: 'PCS',
    opening_stock: 0,
    show_in_online_store: false
  });

  useEffect(() => {
    if (currentTenant) {
      loadItems();
    }
  }, [currentTenant]);

  const loadItems = async () => {
    if (!currentTenant) return;

    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('item_name');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentTenant) return;

    try {
      let existingSpecsObj: any = {};
      if (editingItem?.specifications) {
        try {
          existingSpecsObj = typeof editingItem.specifications === 'string' ? JSON.parse(editingItem.specifications) : editingItem.specifications;
        } catch {}
      }

      const mergedSpecs = JSON.stringify({
        ...existingSpecsObj,
        seller_name: formData.seller_name || existingSpecsObj.seller_name || '',
        purchase_date: formData.purchase_date || existingSpecsObj.purchase_date || '',
      });

      const updatedPayload = {
        item_type: formData.item_type,
        item_name: formData.item_name,
        category: formData.category,
        description: formData.description || (formData.seller_name ? `Seller: ${formData.seller_name} | Purchase Date: ${formData.purchase_date || 'N/A'}` : ''),
        specifications: mergedSpecs,
        sales_price: formData.sales_price,
        tax_rate: formData.tax_rate,
        measuring_unit: formData.measuring_unit,
        opening_stock: formData.opening_stock,
        show_in_online_store: formData.show_in_online_store,
      };

      if (editingItem) {
        const { error } = await supabase
          .from('items')
          .update(updatedPayload)
          .eq('id', editingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('items')
          .insert({
            ...updatedPayload,
            tenant_id: currentTenant.id
          });

        if (error) throw error;
      }

      await loadItems();
      handleCloseModal();
    } catch (error: any) {
      console.error('Error saving item:', error);
      alert('Failed to save item: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadItems();
    } catch (error: any) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item: ' + error.message);
    }
  };

  const handleOpenModal = (item?: Item) => {
    if (item) {
      setEditingItem(item);
      const meta = parseItemMeta(item);
      setFormData({
        item_type: item.item_type,
        item_name: item.item_name,
        category: item.category || '',
        seller_name: meta.seller || '',
        purchase_date: meta.purchaseDate || '',
        description: item.description || '',
        specifications: item.specifications || '',
        sales_price: item.sales_price,
        tax_rate: item.tax_rate,
        measuring_unit: item.measuring_unit,
        opening_stock: item.opening_stock,
        show_in_online_store: item.show_in_online_store
      });
    } else {
      setEditingItem(null);
      setFormData({
        item_type: 'product',
        item_name: '',
        category: 'Solar Panels (DCR)',
        seller_name: '',
        purchase_date: new Date().toISOString().split('T')[0],
        description: '',
        specifications: '',
        sales_price: 0,
        tax_rate: 12,
        measuring_unit: 'PCS',
        opening_stock: 0,
        show_in_online_store: false
      });
    }
    setShowModal(true);
    setActiveTab('basic');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setActiveTab('basic');
  };

  // Extract distinct categories and sellers for filter dropdowns
  const { categories, sellers, overallMetrics, categorySummaryMap } = useMemo(() => {
    const cats = new Set<string>();
    const sells = new Set<string>();
    let totalStockValue = 0;
    let totalUnits = 0;
    let totalCapacityKwp = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const catMap: Record<string, { count: number; totalQty: number; totalValue: number; totalKwp: number; units: Set<string> }> = {};

    items.forEach((item) => {
      const cat = item.category?.trim() || 'Uncategorized';
      cats.add(cat);
      const meta = parseItemMeta(item);
      if (meta.seller) sells.add(meta.seller);

      const qty = Number(item.opening_stock) || 0;
      const val = qty * (Number(item.sales_price) || 0);
      const kwp = meta.totalCapacityKwp || 0;

      totalStockValue += val;
      totalUnits += qty;
      totalCapacityKwp += kwp;

      if (qty === 0) outOfStockCount++;
      else if (qty > 0 && qty <= 5) lowStockCount++;

      if (!catMap[cat]) {
        catMap[cat] = { count: 0, totalQty: 0, totalValue: 0, totalKwp: 0, units: new Set() };
      }
      catMap[cat].count += 1;
      catMap[cat].totalQty += qty;
      catMap[cat].totalValue += val;
      catMap[cat].totalKwp += kwp;
      catMap[cat].units.add(item.measuring_unit || 'PCS');
    });

    return {
      categories: Array.from(cats).sort(),
      sellers: Array.from(sells).sort(),
      categorySummaryMap: catMap,
      overallMetrics: {
        totalItems: items.length,
        totalStockValue,
        totalUnits,
        totalCapacityKwp,
        lowStockCount,
        outOfStockCount,
      }
    };
  }, [items]);

  // Handle Sort Toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and Sort Items
  const filteredAndSortedItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return items
      .filter((item) => {
        const meta = parseItemMeta(item);
        const cat = item.category?.trim() || 'Uncategorized';

        // Search filter
        if (term) {
          const matchName = item.item_name.toLowerCase().includes(term);
          const matchCategory = cat.toLowerCase().includes(term);
          const matchSeller = meta.seller.toLowerCase().includes(term);
          const matchDate = meta.purchaseDate.toLowerCase().includes(term);
          const matchOem = meta.oemCode.toLowerCase().includes(term);
          const matchSerials = meta.serialNumbers.some(s => s.toLowerCase().includes(term));
          if (!matchName && !matchCategory && !matchSeller && !matchDate && !matchOem && !matchSerials) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== 'ALL' && cat !== selectedCategory) {
          return false;
        }

        // Seller filter
        if (selectedSeller !== 'ALL' && meta.seller !== selectedSeller) {
          return false;
        }

        // Stock filter
        const qty = item.opening_stock || 0;
        if (stockFilter === 'IN_STOCK' && qty <= 0) return false;
        if (stockFilter === 'LOW_STOCK' && (qty <= 0 || qty > 5)) return false;
        if (stockFilter === 'OUT_OF_STOCK' && qty > 0) return false;

        return true;
      })
      .sort((a, b) => {
        const metaA = parseItemMeta(a);
        const metaB = parseItemMeta(b);
        let comparison = 0;

        switch (sortField) {
          case 'item_name':
            comparison = a.item_name.localeCompare(b.item_name);
            break;
          case 'category':
            comparison = (a.category || '').localeCompare(b.category || '');
            break;
          case 'seller':
            comparison = metaA.seller.localeCompare(metaB.seller);
            break;
          case 'purchase_date':
            comparison = (metaA.purchaseDate || '').localeCompare(metaB.purchaseDate || '');
            break;
          case 'opening_stock':
            comparison = (a.opening_stock || 0) - (b.opening_stock || 0);
            break;
          case 'sales_price':
            comparison = (a.sales_price || 0) - (b.sales_price || 0);
            break;
          case 'stock_value':
            comparison = metaA.stockValue - metaB.stockValue;
            break;
          case 'capacity':
            comparison = metaA.totalCapacityKwp - metaB.totalCapacityKwp;
            break;
          default:
            comparison = 0;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [items, searchTerm, selectedCategory, selectedSeller, stockFilter, sortField, sortDirection]);

  // Group items by category for Grouped View
  const groupedItems = useMemo(() => {
    const groups: Record<string, Item[]> = {};
    filteredAndSortedItems.forEach((item) => {
      const cat = item.category?.trim() || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [filteredAndSortedItems]);

  const hasActiveFilters = searchTerm !== '' || selectedCategory !== 'ALL' || selectedSeller !== 'ALL' || stockFilter !== 'ALL';

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setSelectedSeller('ALL');
    setStockFilter('ALL');
    setSortField('item_name');
    setSortDirection('asc');
  };

  // Export filtered items to CSV
  const handleExportCSV = () => {
    const headers = ['Item Name', 'Category', 'Seller / Vendor', 'Purchase Date', 'Available Stock', 'Measuring Unit', 'Unit Price (INR)', 'Total Stock Value (INR)', 'GST Rate (%)', 'OEM Code', 'Wattage (Wp)', 'Capacity (kWp)', 'Serials Tracked'];
    const rows = filteredAndSortedItems.map(item => {
      const meta = parseItemMeta(item);
      return [
        `"${item.item_name.replace(/"/g, '""')}"`,
        `"${(item.category || 'General').replace(/"/g, '""')}"`,
        `"${meta.seller.replace(/"/g, '""')}"`,
        `"${meta.purchaseDate}"`,
        item.opening_stock,
        item.measuring_unit,
        item.sales_price,
        meta.stockValue,
        item.tax_rate,
        `"${meta.oemCode}"`,
        meta.wattage,
        meta.totalCapacityKwp.toFixed(2),
        meta.serialCount
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventory_Stock_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySerials = () => {
    if (!viewingSerialsItem) return;
    const text = viewingSerialsItem.serials.join('\n');
    navigator.clipboard.writeText(text);
    setCopiedSerials(true);
    setTimeout(() => setCopiedSerials(false), 2000);
  };

  const filteredSerials = useMemo(() => {
    if (!viewingSerialsItem) return [];
    if (!serialSearchTerm.trim()) return viewingSerialsItem.serials;
    return viewingSerialsItem.serials.filter(s => s.toLowerCase().includes(serialSearchTerm.toLowerCase().trim()));
  }, [viewingSerialsItem, serialSearchTerm]);

  // Helper to render table row cleanly
  const renderTableRow = (item: Item, showCategoryCol = false) => {
    const meta = parseItemMeta(item);
    return (
      <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
        {/* Item Name & Specs */}
        <td className="py-3 px-4 font-medium text-gray-900">
          <div className="flex flex-col">
            <span className="font-bold text-gray-900 text-xs">{item.item_name}</span>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {meta.oemCode && (
                <span className="text-[10px] text-gray-500 font-mono">
                  OEM: {meta.oemCode}
                </span>
              )}
              {meta.wattage > 0 && (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  {meta.wattage} Wp
                </span>
              )}
            </div>
          </div>
        </td>

        {/* Optional Category Column for Flat List */}
        {showCategoryCol && (
          <td className="py-3 px-3">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
              {item.category || 'General'}
            </span>
          </td>
        )}

        {/* Seller / Vendor */}
        <td className="py-3 px-3">
          {meta.seller ? (
            <span className="inline-flex items-center gap-1 font-semibold text-gray-800 text-[11px] bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">
              <Building2 className="w-3 h-3 text-gray-500" />
              {meta.seller}
            </span>
          ) : (
            <span className="text-gray-400 italic text-[11px]">-</span>
          )}
        </td>

        {/* Purchase / Inward Date */}
        <td className="py-3 px-3 text-center">
          {meta.purchaseDate ? (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-800 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
              <Calendar className="w-3 h-3 text-blue-600" />
              {meta.purchaseDate}
            </span>
          ) : (
            <span className="text-gray-400 text-[11px]">-</span>
          )}
        </td>

        {/* Available Stock & Serials */}
        <td className="py-3 px-3 text-center">
          <div className="flex flex-col items-center">
            <span className={`text-xs font-black ${
              item.opening_stock === 0 ? 'text-red-600' : item.opening_stock <= 5 ? 'text-amber-600' : 'text-gray-900'
            }`}>
              {item.opening_stock} {item.measuring_unit}
            </span>
            {meta.serialCount > 0 && (
              <button
                onClick={() => {
                  setViewingSerialsItem({
                    name: item.item_name,
                    serials: meta.serialNumbers
                  });
                  setSerialSearchTerm('');
                }}
                className="text-[9px] text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded-md mt-0.5 border border-emerald-200 transition-colors cursor-pointer"
                title="Click to view all individual serial numbers"
              >
                {meta.serialCount} Serials Tracked 🔍
              </button>
            )}
          </div>
        </td>

        {/* Unit Price */}
        <td className="py-3 px-3 text-right font-semibold text-gray-800">
          ₹ {item.sales_price ? item.sales_price.toLocaleString('en-IN') : '0'}
        </td>

        {/* Total Stock Value */}
        <td className="py-3 px-4 text-right bg-emerald-50/20">
          <div className="flex flex-col items-end">
            <span className="font-black text-xs text-emerald-800">
              ₹ {meta.stockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            {meta.totalCapacityKwp > 0 && (
              <span className="text-[10px] text-amber-700 font-bold">
                {meta.totalCapacityKwp.toFixed(2)} kWp
              </span>
            )}
          </div>
        </td>

        {/* GST Tax Rate */}
        <td className="py-3 px-3 text-center font-semibold text-gray-600">
          {item.tax_rate}%
        </td>

        {/* Actions */}
        <td className="py-3 px-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => handleOpenModal(item)}
              className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
              title="Edit Item Details"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleDelete(item.id)}
              className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
              title="Delete Item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  if (!isAdminUser) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 bg-white p-8 rounded-2xl border border-gray-200 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
          <p className="text-sm text-gray-500">
            Only administrators have permission to access and manage Items & Inventory master data.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-gray-600">Loading Inventory Stock & Categories...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                Inventory & Stock Management
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Categorized stock register, real-time inventory valuations, vendor tracking, and live serial numbers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-gray-300"
            title="Export filtered stock list to CSV"
          >
            <Download className="h-4 w-4 text-gray-600" />
            Export CSV
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add New Item
          </button>
        </div>
      </div>

      {/* KPI Overview & Valuation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Stock Valuation */}
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-4 rounded-2xl shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
              Total Stock Value
            </span>
            <div className="p-1.5 bg-white/20 backdrop-blur-xs rounded-lg">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black tracking-tight">
              ₹ {overallMetrics.totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
          <p className="text-[11px] text-emerald-100 mt-1 font-medium">
            Based on current active unit prices
          </p>
        </div>

        {/* Total Units in Stock */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Total Physical Units
            </span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-gray-900 tracking-tight">
              {overallMetrics.totalUnits.toLocaleString('en-IN')}
            </span>
            <span className="text-xs font-bold text-gray-500">PCS / Units</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1 font-medium">
            Across {overallMetrics.totalItems} distinct SKUs & models
          </p>
        </div>

        {/* Total Solar Capacity (kWp) */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Solar Module Capacity
            </span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-900 tracking-tight">
              {overallMetrics.totalCapacityKwp.toFixed(2)}
            </span>
            <span className="text-xs font-bold text-amber-700">kWp Power</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1 font-medium">
            DCR & ALMM compliant solar modules
          </p>
        </div>

        {/* Categories & Vendors */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Categories & Vendors
            </span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-900 tracking-tight">
              {categories.length}
            </span>
            <span className="text-xs font-semibold text-gray-500">Categories</span>
            <span className="text-gray-300">•</span>
            <span className="text-sm font-bold text-gray-700">{sellers.length} Sellers</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1 font-medium">
            {overallMetrics.outOfStockCount > 0 ? (
              <span className="text-red-600 font-semibold">{overallMetrics.outOfStockCount} items out of stock</span>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 inline" /> All items in stock
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Category Breakdown Quick Cards & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
              Filter by Category & Valuations
            </h2>
          </div>
          <span className="text-[11px] text-gray-500">
            Click any category card below to filter items instantly
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {/* All Categories Pill Card */}
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              selectedCategory === 'ALL'
                ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-gray-900">All Categories</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white">
                {items.length}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-gray-600 font-medium">{overallMetrics.totalUnits} Total Units</span>
              <span className="font-bold text-emerald-700">
                ₹ {overallMetrics.totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </button>

          {/* Individual Category Cards */}
          {categories.map((cat) => {
            const summary = categorySummaryMap[cat] || { count: 0, totalQty: 0, totalValue: 0, totalKwp: 0 };
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(isSelected ? 'ALL' : cat)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs text-gray-900 truncate" title={cat}>
                    {cat}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                    isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {summary.count} {summary.count === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-gray-600 font-semibold">
                    {summary.totalQty} PCS {summary.totalKwp > 0 && `(${summary.totalKwp.toFixed(1)} kWp)`}
                  </span>
                  <span className="font-bold text-emerald-700">
                    ₹ {summary.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Bar */}
          <div className="md:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search items, categories, sellers, serials, dates..."
              className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400 bg-gray-50/50 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Seller / Vendor Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700"
            >
              <option value="ALL">🏢 All Sellers / Vendors ({sellers.length})</option>
              {sellers.map((seller) => (
                <option key={seller} value={seller}>
                  {seller}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Level Filter */}
          <div className="md:col-span-2">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-700"
            >
              <option value="ALL">📦 All Stock Levels</option>
              <option value="IN_STOCK">🟢 In Stock (&gt; 0)</option>
              <option value="LOW_STOCK">🟡 Low Stock (1 - 5)</option>
              <option value="OUT_OF_STOCK">🔴 Out of Stock (0)</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="md:col-span-3 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1.5 bg-gray-50 border border-gray-300 rounded-xl px-2.5 py-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="bg-transparent text-xs font-semibold text-gray-800 focus:outline-none w-full cursor-pointer"
              >
                <option value="item_name">Sort: Item Name</option>
                <option value="category">Sort: Category</option>
                <option value="stock_value">Sort: Stock Value (₹)</option>
                <option value="opening_stock">Sort: Stock Quantity</option>
                <option value="sales_price">Sort: Unit Price</option>
                <option value="capacity">Sort: Capacity (kWp)</option>
                <option value="purchase_date">Sort: Purchase Date</option>
                <option value="seller">Sort: Seller / Vendor</option>
              </select>
              <button
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1 hover:bg-gray-200 rounded-md text-gray-600 transition-colors cursor-pointer"
                title={`Sort ${sortDirection === 'asc' ? 'Ascending (Click for Descending)' : 'Descending (Click for Ascending)'}`}
              >
                {sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />}
              </button>
            </div>

            {/* View Mode Toggle: Grouped vs List */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
              <button
                onClick={() => setViewMode('grouped')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'grouped' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Group items by Category"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'list' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Flat Table List"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Bar */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-500 font-medium">Active Filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold border border-blue-200">
                  Search: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')}><X className="w-3 h-3 hover:text-blue-900" /></button>
                </span>
              )}
              {selectedCategory !== 'ALL' && (
                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-semibold border border-purple-200">
                  Category: {selectedCategory}
                  <button onClick={() => setSelectedCategory('ALL')}><X className="w-3 h-3 hover:text-purple-900" /></button>
                </span>
              )}
              {selectedSeller !== 'ALL' && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md font-semibold border border-amber-200">
                  Seller: {selectedSeller}
                  <button onClick={() => setSelectedSeller('ALL')}><X className="w-3 h-3 hover:text-amber-900" /></button>
                </span>
              )}
              {stockFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-semibold border border-emerald-200">
                  Stock: {stockFilter.replace('_', ' ')}
                  <button onClick={() => setStockFilter('ALL')}><X className="w-3 h-3 hover:text-emerald-900" /></button>
                </span>
              )}
            </div>

            <button
              onClick={resetFilters}
              className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* RENDER VIEW: GROUPED BY CATEGORY VS FLAT LIST TABLE */}
      {viewMode === 'grouped' ? (
        /* Grouped by Category View */
        <div className="space-y-6">
          {Object.keys(groupedItems).length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-gray-200">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-gray-800">No items match your filters</h3>
              <p className="text-xs text-gray-500 mt-1">Try clearing some search terms or filters above.</p>
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            Object.entries(groupedItems).map(([categoryName, groupItems]) => {
              const groupQty = groupItems.reduce((acc, curr) => acc + (Number(curr.opening_stock) || 0), 0);
              const groupValue = groupItems.reduce((acc, curr) => acc + parseItemMeta(curr).stockValue, 0);
              const groupKwp = groupItems.reduce((acc, curr) => acc + parseItemMeta(curr).totalCapacityKwp, 0);

              return (
                <div key={categoryName} className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                  {/* Category Header with Subtotals */}
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50/40 p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 bg-blue-600 text-white rounded-lg">
                        <Tag className="w-4 h-4" />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">
                          {categoryName}
                        </h3>
                        <span className="text-[11px] text-gray-500">
                          {groupItems.length} {groupItems.length === 1 ? 'model / SKU' : 'models / SKUs'}
                        </span>
                      </div>
                    </div>

                    {/* Subtotals Badges */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-200 shadow-2xs text-xs">
                        <span className="text-gray-500 font-medium">Quantity: </span>
                        <span className="font-bold text-gray-900">{groupQty} Units</span>
                        {groupKwp > 0 && (
                          <span className="text-amber-700 font-bold ml-1">({groupKwp.toFixed(2)} kWp)</span>
                        )}
                      </div>
                      <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs text-xs">
                        <span className="text-emerald-700 font-medium">Category Valuation: </span>
                        <span className="font-black text-emerald-900">
                          ₹ {groupValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Items Table for this Category */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 uppercase font-bold text-[10px] tracking-wider">
                          <th className="py-3 px-4 cursor-pointer hover:text-blue-600" onClick={() => handleSort('item_name')}>
                            Item Name & Model {sortField === 'item_name' && (sortDirection === 'asc' ? '🔼' : '🔽')}
                          </th>
                          <th className="py-3 px-3 cursor-pointer hover:text-blue-600" onClick={() => handleSort('seller')}>
                            Seller / Vendor {sortField === 'seller' && (sortDirection === 'asc' ? '🔼' : '🔽')}
                          </th>
                          <th className="py-3 px-3 text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort('purchase_date')}>
                            Purchase Date {sortField === 'purchase_date' && (sortDirection === 'asc' ? '🔼' : '🔽')}
                          </th>
                          <th className="py-3 px-3 text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort('opening_stock')}>
                            Stock Qty {sortField === 'opening_stock' && (sortDirection === 'asc' ? '🔼' : '🔽')}
                          </th>
                          <th className="py-3 px-3 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('sales_price')}>
                            Unit Price (₹) {sortField === 'sales_price' && (sortDirection === 'asc' ? '🔼' : '🔽')}
                          </th>
                          <th className="py-3 px-4 text-right cursor-pointer hover:text-blue-600 bg-emerald-50/30" onClick={() => handleSort('stock_value')}>
                            Total Stock Value (₹) {sortField === 'stock_value' && (sortDirection === 'asc' ? '🔼' : '🔽')}
                          </th>
                          <th className="py-3 px-3 text-center">Tax</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {groupItems.map((item) => renderTableRow(item))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Flat List Table View */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-gray-700 uppercase font-bold text-[10px] tracking-wider">
                  <th className="py-3.5 px-4 cursor-pointer hover:text-blue-600" onClick={() => handleSort('item_name')}>
                    <div className="flex items-center gap-1">
                      Item Name & Model
                      {sortField === 'item_name' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                    </div>
                  </th>
                  <th className="py-3.5 px-3 cursor-pointer hover:text-blue-600" onClick={() => handleSort('category')}>
                    <div className="flex items-center gap-1">
                      Category
                      {sortField === 'category' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                    </div>
                  </th>
                  <th className="py-3.5 px-3 cursor-pointer hover:text-blue-600" onClick={() => handleSort('seller')}>
                    <div className="flex items-center gap-1">
                      Seller / Vendor
                      {sortField === 'seller' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                    </div>
                  </th>
                  <th className="py-3.5 px-3 text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort('purchase_date')}>
                    <div className="flex items-center justify-center gap-1">
                      Purchase Date
                      {sortField === 'purchase_date' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                    </div>
                  </th>
                  <th className="py-3.5 px-3 text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort('opening_stock')}>
                    <div className="flex items-center justify-center gap-1">
                      Stock Qty
                      {sortField === 'opening_stock' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                    </div>
                  </th>
                  <th className="py-3.5 px-3 text-right cursor-pointer hover:text-blue-600" onClick={() => handleSort('sales_price')}>
                    <div className="flex items-center justify-end gap-1">
                      Unit Price (₹)
                      {sortField === 'sales_price' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />) : <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-right cursor-pointer hover:text-blue-600 bg-emerald-50/40" onClick={() => handleSort('stock_value')}>
                    <div className="flex items-center justify-end gap-1 font-extrabold text-emerald-900">
                      Total Value (₹)
                      {sortField === 'stock_value' ? (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-700" /> : <ArrowDown className="w-3 h-3 text-emerald-700" />) : <ArrowUpDown className="w-3 h-3 text-emerald-600" />}
                    </div>
                  </th>
                  <th className="py-3.5 px-3 text-center">GST Tax</th>
                  <th className="py-3.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAndSortedItems.map((item) => renderTableRow(item, true))}
                {filteredAndSortedItems.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400 text-xs">
                      No stock items found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Serial Numbers Viewer Modal */}
      {viewingSerialsItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-emerald-600" />
                  Live Serial Numbers Register
                </h3>
                <p className="text-xs text-gray-600 font-medium mt-0.5">
                  {viewingSerialsItem.name} ({viewingSerialsItem.serials.length} Panels)
                </p>
              </div>
              <button
                onClick={() => setViewingSerialsItem(null)}
                className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={serialSearchTerm}
                  onChange={(e) => setSerialSearchTerm(e.target.value)}
                  placeholder="Search serial number..."
                  className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <button
                onClick={handleCopySerials}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                {copiedSerials ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy All
                  </>
                )}
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredSerials.map((sn, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-gray-50 hover:bg-blue-50/50 rounded-lg border border-gray-200 font-mono text-[11px] text-gray-800 flex items-center justify-between group"
                  >
                    <span className="font-bold text-gray-400 text-[9px] mr-1">#{idx + 1}</span>
                    <span className="truncate">{sn}</span>
                  </div>
                ))}
                {filteredSerials.length === 0 && (
                  <div className="col-span-3 text-center py-6 text-xs text-gray-400">
                    No matching serial numbers found.
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
              <span>Showing {filteredSerials.length} of {viewingSerialsItem.serials.length} serials</span>
              <button
                onClick={() => setViewingSerialsItem(null)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 font-bold rounded-lg text-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingItem ? 'Edit Stock Item & Metadata' : 'Add New Inventory Stock Item'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Update product details, vendor purchase source, valuation, and technical specifications.
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-56 border-r border-gray-200 bg-gray-50 p-4 space-y-1">
                <button
                  onClick={() => setActiveTab('basic')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'basic' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-200/70'
                  }`}
                >
                  📝 Basic & Vendor Info
                </button>
                <button
                  onClick={() => setActiveTab('stock')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'stock' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-200/70'
                  }`}
                >
                  📦 Stock & Units
                </button>
                <button
                  onClick={() => setActiveTab('pricing')}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === 'pricing' ? 'bg-blue-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-200/70'
                  }`}
                >
                  ₹ Valuation & Pricing
                </button>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                {activeTab === 'basic' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Item Type *
                        </label>
                        <div className="flex gap-4 p-2 bg-gray-50 rounded-xl border border-gray-200">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                            <input
                              type="radio"
                              value="product"
                              checked={formData.item_type === 'product'}
                              onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span>Product (Stock)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                            <input
                              type="radio"
                              value="service"
                              checked={formData.item_type === 'service'}
                              onChange={(e) => setFormData({ ...formData, item_type: e.target.value })}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span>Service</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Category *
                        </label>
                        <input
                          type="text"
                          value={formData.category}
                          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="e.g. Solar Panels (DCR), Inverters, Structures"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Seller / Vendor / Supplier Name
                        </label>
                        <input
                          type="text"
                          value={formData.seller_name}
                          onChange={(e) => setFormData({ ...formData, seller_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="e.g. Waaree Energies / Vikram Solar"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Purchase / Inward Date
                        </label>
                        <input
                          type="date"
                          value={formData.purchase_date}
                          onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Item Name & Model *
                      </label>
                      <input
                        type="text"
                        value={formData.item_name}
                        onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="e.g. 550W Mono PERC DCR (HMM 550 WP)"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Item summary or description..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">
                        Technical Specifications (JSON)
                      </label>
                      <textarea
                        value={formData.specifications}
                        onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl font-mono text-[11px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder='{"wattage_wp": 550, "oem_item_code": "..."}'
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'stock' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Measuring Unit
                        </label>
                        <select
                          value={formData.measuring_unit}
                          onChange={(e) => setFormData({ ...formData, measuring_unit: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="PCS">Pieces (PCS)</option>
                          <option value="NOS">Numbers (NOS)</option>
                          <option value="KW">Kilowatts (KW)</option>
                          <option value="M">Meters (M)</option>
                          <option value="KG">Kilograms (KG)</option>
                          <option value="SET">Sets (SET)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Opening / Available Stock
                        </label>
                        <input
                          type="number"
                          value={formData.opening_stock}
                          onChange={(e) => setFormData({ ...formData, opening_stock: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          placeholder="e.g. 150"
                          min="0"
                          step="1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'pricing' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          Sales Price / Unit (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">
                            ₹
                          </span>
                          <input
                            type="number"
                            value={formData.sales_price}
                            onChange={(e) => setFormData({ ...formData, sales_price: Number(e.target.value) })}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="e.g. 11500"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1.5">
                          GST Tax Rate (%)
                        </label>
                        <select
                          value={formData.tax_rate}
                          onChange={(e) => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="0">0% (Exempted)</option>
                          <option value="5">5% (Solar Concessional)</option>
                          <option value="12">12% (Standard Solar Equipment)</option>
                          <option value="18">18% (Standard Goods & Services)</option>
                          <option value="28">28% (Special Goods)</option>
                        </select>
                      </div>
                    </div>

                    {/* Calculated Line Item Stock Value Preview */}
                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-emerald-900 block">Total Stock Valuation Preview:</span>
                          <span className="text-[11px] text-emerald-700">
                            {formData.opening_stock} {formData.measuring_unit} × ₹ {formData.sales_price || 0}
                          </span>
                        </div>
                        <span className="text-xl font-black text-emerald-800">
                          ₹ {((formData.opening_stock || 0) * (formData.sales_price || 0)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCloseModal}
                className="px-5 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.item_name}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
              >
                Save Stock Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
