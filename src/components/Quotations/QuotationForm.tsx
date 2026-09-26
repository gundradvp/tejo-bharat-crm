import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { ArrowLeft, Plus, Trash2, Printer, Save, Search, X } from 'lucide-react';
import { generateEnhancedQuotationHTML } from '../Customers/EnhancedQuotationGenerator';

interface LineItem {
  id?: string;
  item_no: number;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
}

interface BOMItem {
  id?: string;
  item_no: number;
  item_description: string;
  specifications: string;
  quantity: string;
  make: string;
}

interface CompanySettings {
  company_name: string;
  company_logo_url: string;
  pan_number: string;
  gstin: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  bank_name: string;
  bank_branch: string;
  bank_account_no: string;
  bank_ifsc: string;
  cgst_rate: number;
  sgst_rate: number;
  terms_and_conditions: string;
}

export default function QuotationForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customer, setCustomer] = useState<any>(null);
  const [quotation, setQuotation] = useState<any>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');

  const [quotationNo, setQuotationNo] = useState('');
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [shipToName, setShipToName] = useState('');
  const [shipToAddress, setShipToAddress] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { item_no: 1, description: '', quantity: 1, unit: 'PCS', rate: 0, tax_rate: 8.9, tax_amount: 0, total_amount: 0 }
  ]);

  const [bomItems, setBomItems] = useState<BOMItem[]>([
    { item_no: 1, item_description: '', specifications: '', quantity: '', make: '' }
  ]);

  const [reverseCalcMode, setReverseCalcMode] = useState(false);
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const [quickCustomerAddress, setQuickCustomerAddress] = useState('');

  useEffect(() => {
    if (currentTenant) {
      loadInitialData();
    }
  }, [id, currentTenant]);

  useEffect(() => {
    const handleFocus = () => {
      if (currentTenant && !companySettings) {
        loadInitialData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentTenant, companySettings]);

  useEffect(() => {
    if (selectedCustomerId) {
      loadCustomerDetails(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const loadInitialData = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);

      const { data: customersData } = await supabase
        .from('customers')
        .select('id, customer_name, phone, address, district_name')
        .eq('tenant_id', currentTenant.id)
        .order('customer_name', { ascending: true });

      setCustomers(customersData || []);

      const { data: settingsData } = await supabase
        .from('company_settings')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();

      if (settingsData) {
        setCompanySettings(settingsData);
        if (!termsAndConditions && settingsData.terms_and_conditions) {
          setTermsAndConditions(settingsData.terms_and_conditions);
        }
      }

      if (id) {
        const { data: quotationData } = await supabase
          .from('quotations')
          .select('*')
          .eq('id', id)
          .eq('tenant_id', currentTenant.id)
          .maybeSingle();

        if (quotationData) {
          setQuotation(quotationData);
          setSelectedCustomerId(quotationData.customer_id || '');
          setQuotationNo(quotationData.quotation_no || '');
          setQuotationDate(quotationData.quotation_date?.split('T')[0] || new Date().toISOString().split('T')[0]);
          setExpiryDate(quotationData.expiry_date?.split('T')[0] || '');
          setPlaceOfSupply(quotationData.place_of_supply || '');
          setShipToName(quotationData.ship_to_name || '');
          setShipToAddress(quotationData.ship_to_address || '');
          setTermsAndConditions(quotationData.terms_and_conditions || termsAndConditions);

          const { data: itemsData } = await supabase
            .from('quotation_items')
            .select('*')
            .eq('quotation_id', quotationData.id)
            .order('item_no', { ascending: true });

          if (itemsData && itemsData.length > 0) {
            setLineItems(itemsData.map(item => ({
              id: item.id,
              item_no: item.item_no,
              description: item.description,
              quantity: Number(item.quantity),
              unit: item.unit,
              rate: Number(item.rate),
              tax_rate: Number(item.tax_rate),
              tax_amount: Number(item.tax_amount),
              total_amount: Number(item.total_amount)
            })));
          }

          const { data: bomData } = await supabase
            .from('quotation_bom_items')
            .select('*')
            .eq('quotation_id', quotationData.id)
            .order('item_no', { ascending: true });

          if (bomData && bomData.length > 0) {
            setBomItems(bomData.map(item => ({
              id: item.id,
              item_no: item.item_no,
              item_description: item.item_description,
              specifications: item.specifications || '',
              quantity: item.quantity || '',
              make: item.make || ''
            })));
          }
        }
      } else {
        generateQuotationNumber();
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      alert('Failed to load quotation details');
    } finally {
      setLoading(false);
    }
  };

  const generateQuotationNumber = async () => {
    if (!currentTenant) return;

    try {
      const { data } = await supabase
        .from('quotations')
        .select('quotation_no')
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.quotation_no) {
        const lastNo = parseInt(data.quotation_no.replace(/\D/g, '')) || 0;
        setQuotationNo(`Q${new Date().getFullYear()}${String(lastNo + 1).padStart(4, '0')}`);
      } else {
        setQuotationNo(`Q${new Date().getFullYear()}0001`);
      }
    } catch (error) {
      console.error('Error generating quotation number:', error);
      setQuotationNo(`Q${new Date().getFullYear()}0001`);
    }
  };

  const loadCustomerDetails = async (customerId: string) => {
    try {
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .maybeSingle();

      if (customerData) {
        setCustomer(customerData);
        setPlaceOfSupply(customerData.district_name || 'Telangana');
        setShipToName(customerData.customer_name);
        setShipToAddress(customerData.address || '');
      }
    } catch (error) {
      console.error('Error loading customer details:', error);
    }
  };

  const handleQuickAddCustomer = async () => {
    if (!currentTenant) return;

    if (!quickCustomerName || !quickCustomerPhone) {
      alert('Please enter customer name and phone');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          customer_name: quickCustomerName,
          phone: quickCustomerPhone,
          address: quickCustomerAddress || null,
          tenant_id: currentTenant.id,
          overall_status: 'new'
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCustomers([...customers, data]);
        setSelectedCustomerId(data.id);
        setQuickCustomerName('');
        setQuickCustomerPhone('');
        setQuickCustomerAddress('');
        setShowQuickAddCustomer(false);
        alert('Customer added successfully!');
      }
    } catch (error: any) {
      console.error('Error adding customer:', error);
      alert('Failed to add customer: ' + error.message);
    }
  };

  const calculateLineItemTotals = (item: LineItem, reverse: boolean = false) => {
    if (reverse) {
      const rate = item.total_amount / (item.quantity * (1 + item.tax_rate / 100));
      const taxableAmount = item.quantity * rate;
      const taxAmount = (taxableAmount * item.tax_rate) / 100;
      return { rate, tax_amount: taxAmount, total_amount: item.total_amount };
    } else {
      const taxableAmount = item.quantity * item.rate;
      const taxAmount = (taxableAmount * item.tax_rate) / 100;
      const total = taxableAmount + taxAmount;
      return { rate: item.rate, tax_amount: taxAmount, total_amount: total };
    }
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };

    if (reverseCalcMode && field === 'total_amount') {
      const calculated = calculateLineItemTotals(newItems[index], true);
      newItems[index].rate = calculated.rate;
      newItems[index].tax_amount = calculated.tax_amount;
    } else if (!reverseCalcMode && ['quantity', 'rate', 'tax_rate'].includes(field)) {
      const calculated = calculateLineItemTotals(newItems[index], false);
      newItems[index].tax_amount = calculated.tax_amount;
      newItems[index].total_amount = calculated.total_amount;
    } else if (reverseCalcMode && ['quantity', 'tax_rate'].includes(field)) {
      const calculated = calculateLineItemTotals(newItems[index], true);
      newItems[index].rate = calculated.rate;
      newItems[index].tax_amount = calculated.tax_amount;
    }

    setLineItems(newItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      item_no: lineItems.length + 1,
      description: '',
      quantity: 1,
      unit: 'PCS',
      rate: 0,
      tax_rate: 8.9,
      tax_amount: 0,
      total_amount: 0
    }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      const newItems = lineItems.filter((_, i) => i !== index);
      newItems.forEach((item, i) => item.item_no = i + 1);
      setLineItems(newItems);
    }
  };

  const handleBOMItemChange = (index: number, field: keyof BOMItem, value: any) => {
    const newItems = [...bomItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setBomItems(newItems);
  };

  const addBOMItem = () => {
    setBomItems([...bomItems, {
      item_no: bomItems.length + 1,
      item_description: '',
      specifications: '',
      quantity: '',
      make: ''
    }]);
  };

  const removeBOMItem = (index: number) => {
    if (bomItems.length > 1) {
      const newItems = bomItems.filter((_, i) => i !== index);
      newItems.forEach((item, i) => item.item_no = i + 1);
      setBomItems(newItems);
    }
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total_amount, 0);
    const taxableAmount = lineItems.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const totalTax = lineItems.reduce((sum, item) => sum + item.tax_amount, 0);
    const cgst = totalTax / 2;
    const sgst = totalTax / 2;

    return {
      taxableAmount,
      subtotal,
      cgst,
      sgst,
      totalAmount: subtotal
    };
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if (num === 0) return 'Zero Rupees Only';

    const convertToWords = (n: number): string => {
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 > 0 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 > 0 ? ' ' + convertToWords(n % 100) : '');
      if (n < 100000) return convertToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 > 0 ? ' ' + convertToWords(n % 1000) : '');
      if (n < 10000000) return convertToWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 > 0 ? ' ' + convertToWords(n % 100000) : '');
      return convertToWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 > 0 ? ' ' + convertToWords(n % 10000000) : '');
    };

    return convertToWords(Math.floor(num)) + ' Rupees Only';
  };

  const handleSave = async () => {
    if (!currentTenant) {
      alert('Tenant information is missing. Please refresh the page.');
      return;
    }

    if (!quotationNo) {
      alert('Please enter a quotation number');
      return;
    }

    if (!selectedCustomerId) {
      alert('Please select a customer');
      return;
    }

    if (!customer) {
      alert('Customer data not loaded. Please select a customer again.');
      return;
    }

    setSaving(true);

    try {
      const { user } = await supabase.auth.getUser().then(res => res.data);
      const totals = calculateTotals();

      const quotationData = {
        tenant_id: currentTenant.id,
        quotation_no: quotationNo,
        quotation_date: quotationDate,
        expiry_date: expiryDate || null,
        customer_id: customer.id,
        customer_name: customer.customer_name,
        customer_mobile: customer.phone,
        customer_email: customer.email,
        customer_address: customer.address,
        place_of_supply: placeOfSupply,
        ship_to_name: shipToName,
        ship_to_address: shipToAddress,
        subtotal: totals.subtotal,
        tax_amount: totals.cgst + totals.sgst,
        cgst_amount: totals.cgst,
        sgst_amount: totals.sgst,
        igst_amount: 0,
        total_amount: totals.totalAmount,
        total_amount_words: numberToWords(totals.totalAmount),
        terms_and_conditions: termsAndConditions,
        status: 'active',
        created_by: user?.id
      };

      let quotationId = quotation?.id;

      if (quotation) {
        const { error } = await supabase
          .from('quotations')
          .update(quotationData)
          .eq('id', quotation.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('quotations')
          .insert(quotationData)
          .select()
          .single();

        if (error) throw error;
        quotationId = data.id;
        setQuotation(data);
      }

      await supabase
        .from('quotation_items')
        .delete()
        .eq('quotation_id', quotationId);

      const lineItemsToInsert = lineItems.map(item => ({
        quotation_id: quotationId,
        item_no: item.item_no,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        total_amount: item.total_amount
      }));

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(lineItemsToInsert);

      if (itemsError) throw itemsError;

      await supabase
        .from('quotation_bom_items')
        .delete()
        .eq('quotation_id', quotationId);

      const bomItemsToInsert = bomItems
        .filter(item => item.item_description.trim() !== '')
        .map(item => ({
          quotation_id: quotationId,
          item_no: item.item_no,
          item_description: item.item_description,
          specifications: item.specifications,
          quantity: item.quantity,
          make: item.make
        }));

      if (bomItemsToInsert.length > 0) {
        const { error: bomError } = await supabase
          .from('quotation_bom_items')
          .insert(bomItemsToInsert);

        if (bomError) throw bomError;
      }

      alert('Quotation saved successfully!');
      navigate('/quotations');
    } catch (error: any) {
      console.error('Error saving quotation:', error);
      alert('Failed to save quotation: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!customer) {
      alert('Please select a customer first');
      return;
    }

    if (!companySettings) {
      alert('Company settings are not configured. Please go to Settings > Tenant Settings to configure your company details before printing quotations.');
      return;
    }

    try {
      const totals = calculateTotals();

      const quotationData = {
        quotationNo,
        quotationDate: new Date(quotationDate).toLocaleDateString('en-GB'),
        expiryDate: expiryDate ? new Date(expiryDate).toLocaleDateString('en-GB') : '',
        customerName: customer.customer_name,
        customerMobile: customer.phone,
        customerAddress: customer.address || '',
        placeOfSupply,
        shipToName,
        shipToAddress: shipToAddress,
        lineItems: lineItems.map(item => ({
          no: item.item_no,
          items: item.description,
          qty: `${item.quantity} ${item.unit}`,
          rate: item.rate,
          tax: item.tax_amount,
          taxRate: item.tax_rate,
          total: item.total_amount
        })),
        bomItems: bomItems
          .filter(item => item.item_description.trim() !== '')
          .map(item => ({
            sno: item.item_no,
            itemDescription: item.item_description,
            specifications: item.specifications,
            qty: item.quantity,
            make: item.make
          })),
        subtotal: totals.subtotal,
        cgst: totals.cgst,
        sgst: totals.sgst,
        totalAmount: totals.totalAmount,
        totalAmountWords: numberToWords(totals.totalAmount),
        termsAndConditions: termsAndConditions
      };

      const htmlContent = generateEnhancedQuotationHTML(quotationData, companySettings);

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
        }, 500);
      } else {
        alert('Could not open print preview. Please check if pop-ups are blocked in your browser.');
      }
    } catch (error: any) {
      console.error('Error generating quotation:', error);
      alert('Failed to generate quotation preview: ' + error.message);
    }
  };

  const filteredCustomers = customers.filter(c =>
    customerSearch === '' ||
    c.customer_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading quotation...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {!companySettings && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-orange-800">Company Settings Not Configured</h3>
              <p className="mt-1 text-sm text-orange-700">
                To print quotations with your company branding and details, please configure your company settings first.
              </p>
              <div className="mt-2 flex gap-3">
                <button
                  onClick={() => navigate('/settings/tenant')}
                  className="text-sm font-medium text-orange-600 hover:text-orange-700 underline"
                >
                  Go to Settings →
                </button>
                <button
                  onClick={() => loadInitialData()}
                  className="text-sm font-medium text-orange-600 hover:text-orange-700 underline"
                >
                  Reload Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/quotations')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {id ? 'Edit Quotation' : 'Create Quotation'}
            </h1>
            <p className="text-gray-600">{customer?.customer_name || 'Select a customer to begin'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !selectedCustomerId}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Quotation'}
          </button>
          <button
            onClick={handlePrint}
            disabled={!selectedCustomerId}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            Print/Preview
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Customer Selection</h2>
          {!id && (
            <button
              onClick={() => setShowQuickAddCustomer(!showQuickAddCustomer)}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              Quick Add Customer
            </button>
          )}
        </div>

        {showQuickAddCustomer && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-sm font-semibold mb-3 text-green-800">Add New Customer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={quickCustomerName}
                  onChange={(e) => setQuickCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  value={quickCustomerPhone}
                  onChange={(e) => setQuickCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address (Optional)
                </label>
                <input
                  type="text"
                  value={quickCustomerAddress}
                  onChange={(e) => setQuickCustomerAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter customer address"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleQuickAddCustomer}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Add Customer
              </button>
              <button
                onClick={() => {
                  setShowQuickAddCustomer(false);
                  setQuickCustomerName('');
                  setQuickCustomerPhone('');
                  setQuickCustomerAddress('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={customerSearch}
            onChange={(e) => setCustomerSearch(e.target.value)}
            placeholder="Search customer by name or phone..."
            className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {customerSearch && (
            <button
              type="button"
              onClick={() => setCustomerSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <select
          value={selectedCustomerId}
          onChange={(e) => setSelectedCustomerId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={!!id}
        >
          <option value="">Select a customer</option>
          {filteredCustomers.map((cust) => (
            <option key={cust.id} value={cust.id}>
              {cust.customer_name} - {cust.phone}
            </option>
          ))}
        </select>
        {id && (
          <p className="text-sm text-gray-500 mt-2">
            Customer cannot be changed when editing an existing quotation
          </p>
        )}
      </div>

      {selectedCustomerId && (
        <>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Quotation Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quotation No. *
                </label>
                <input
                  type="text"
                  value={quotationNo}
                  onChange={(e) => setQuotationNo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Q2026001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quotation Date *
                </label>
                <input
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Place of Supply
                </label>
                <input
                  type="text"
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Telangana"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ship To Name
                </label>
                <input
                  type="text"
                  value={shipToName}
                  onChange={(e) => setShipToName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Line Items</h2>
                <label className="flex items-center gap-2 mt-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reverseCalcMode}
                    onChange={(e) => setReverseCalcMode(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span>Reverse Calculation Mode (Enter final amount with GST)</span>
                </label>
              </div>
              <button
                onClick={addLineItem}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 text-sm font-medium">No</th>
                    <th className="text-left py-2 px-2 text-sm font-medium">Description</th>
                    <th className="text-left py-2 px-2 text-sm font-medium">Qty</th>
                    <th className="text-left py-2 px-2 text-sm font-medium">Unit</th>
                    <th className="text-left py-2 px-2 text-sm font-medium">{reverseCalcMode ? 'Rate (calc)' : 'Rate'}</th>
                    <th className="text-left py-2 px-2 text-sm font-medium">Tax %</th>
                    <th className="text-left py-2 px-2 text-sm font-medium">{reverseCalcMode ? 'Total (with GST)' : 'Total'}</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-2">{item.item_no}</td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Item description"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleLineItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleLineItemChange(index, 'unit', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="PCS"
                        />
                      </td>
                      <td className="py-2 px-2">
                        {reverseCalcMode ? (
                          <div className="w-28 px-2 py-1 bg-gray-100 border border-gray-300 rounded text-sm">
                            ₹ {item.rate.toFixed(2)}
                          </div>
                        ) : (
                          <input
                            type="number"
                            value={item.rate}
                            onChange={(e) => handleLineItemChange(index, 'rate', Number(e.target.value))}
                            className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                            min="0"
                            step="0.01"
                          />
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          value={item.tax_rate}
                          onChange={(e) => handleLineItemChange(index, 'tax_rate', Number(e.target.value))}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="py-2 px-2">
                        {reverseCalcMode ? (
                          <input
                            type="number"
                            value={item.total_amount}
                            onChange={(e) => handleLineItemChange(index, 'total_amount', Number(e.target.value))}
                            className="w-32 px-2 py-1 border border-gray-300 rounded text-sm font-semibold"
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          <div className="text-sm font-semibold">
                            ₹ {item.total_amount.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {lineItems.length > 1 && (
                          <button
                            onClick={() => removeLineItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₹ {totals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>CGST ({companySettings?.cgst_rate || 4.45}%):</span>
                  <span>₹ {totals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>SGST ({companySettings?.sgst_rate || 4.45}%):</span>
                  <span>₹ {totals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>₹ {totals.totalAmount.toLocaleString('en-IN')}</span>
                </div>
                {!companySettings && (
                  <div className="text-xs text-orange-600 pt-2">
                    ⚠️ Configure company settings to customize tax rates
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Bill of Materials</h2>
              <button
                onClick={addBOMItem}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="h-4 w-4" />
                Add BOM Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 text-sm font-medium">S.No</th>
                    <th className="text-left py-2 px-2 text-sm font-medium">Item Description</th>
                    <th className="text-left py-2 px-2 text-sm font-medium">Specifications</th>
                    <th className="text-left py-2 px-2 text-sm font-medium">Quantity</th>
                    <th className="text-left py-2 px-2 text-sm font-medium">Make</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {bomItems.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 px-2">{item.item_no}</td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={item.item_description}
                          onChange={(e) => handleBOMItemChange(index, 'item_description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Solar PV Module"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={item.specifications}
                          onChange={(e) => handleBOMItemChange(index, 'specifications', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="TOPCON modules"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={item.quantity}
                          onChange={(e) => handleBOMItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="10 Nos"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={item.make}
                          onChange={(e) => handleBOMItemChange(index, 'make', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Adani, Waaree"
                        />
                      </td>
                      <td className="py-2 px-2">
                        {bomItems.length > 1 && (
                          <button
                            onClick={() => removeBOMItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Terms & Conditions</h2>
            <textarea
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter terms and conditions..."
            />
          </div>
        </>
      )}
    </div>
  );
}