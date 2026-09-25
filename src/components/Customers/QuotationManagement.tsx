import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { ArrowLeft, Plus, Trash2, Printer, Save } from 'lucide-react';
import { generateEnhancedQuotationHTML } from './EnhancedQuotationGenerator';

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

export default function QuotationManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [quotation, setQuotation] = useState<any>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);

  const [quotationNo, setQuotationNo] = useState('');
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [shipToName, setShipToName] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { item_no: 1, description: '', quantity: 1, unit: 'PCS', rate: 0, tax_rate: 8.9, tax_amount: 0, total_amount: 0 }
  ]);

  const [bomItems, setBomItems] = useState<BOMItem[]>([
    { item_no: 1, item_description: '', specifications: '', quantity: '', make: '' }
  ]);

  useEffect(() => {
    if (id && currentTenant) {
      fetchData();
    }
  }, [id, currentTenant]);

  const fetchData = async () => {
    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (customerError) throw customerError;
      setCustomer(customerData);

      if (customerData) {
        setPlaceOfSupply(customerData.district_name || 'Telangana');
        setShipToName(customerData.customer_name);
      }

      const { data: quotationData, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('customer_id', id)
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (quotationData) {
        setQuotation(quotationData);
        setQuotationNo(quotationData.quotation_no || '');
        setQuotationDate(quotationData.quotation_date?.split('T')[0] || new Date().toISOString().split('T')[0]);
        setExpiryDate(quotationData.expiry_date?.split('T')[0] || '');
        setPlaceOfSupply(quotationData.place_of_supply || placeOfSupply);
        setShipToName(quotationData.ship_to_name || shipToName);
        setTermsAndConditions(quotationData.terms_and_conditions || '');

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
    } catch (error: any) {
      console.error('Error fetching data:', error);
      alert('Failed to load quotation details');
    } finally {
      setLoading(false);
    }
  };

  const calculateLineItemTotals = (item: LineItem) => {
    const taxableAmount = item.quantity * item.rate;
    const taxAmount = (taxableAmount * item.tax_rate) / 100;
    const total = taxableAmount + taxAmount;
    return { tax_amount: taxAmount, total_amount: total };
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };

    if (['quantity', 'rate', 'tax_rate'].includes(field)) {
      const calculated = calculateLineItemTotals(newItems[index]);
      newItems[index].tax_amount = calculated.tax_amount;
      newItems[index].total_amount = calculated.total_amount;
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

    if (num === 0) return 'Zero';

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
    if (!customer || !currentTenant || !companySettings) {
      alert('Missing required data');
      return;
    }

    if (!quotationNo) {
      alert('Please enter a quotation number');
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
        ship_to_address: customer.address,
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
    } catch (error: any) {
      console.error('Error saving quotation:', error);
      alert('Failed to save quotation: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    if (!customer || !companySettings) {
      alert('Missing required data');
      return;
    }

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
      shipToAddress: customer.address || '',
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
    }
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading quotation...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Customer not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/customers')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotation Management</h1>
            <p className="text-gray-600">{customer.customer_name}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Quotation'}
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print/Preview
          </button>
        </div>
      </div>

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
          <h2 className="text-lg font-semibold">Line Items</h2>
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
                <th className="text-left py-2 px-2 text-sm font-medium">Rate</th>
                <th className="text-left py-2 px-2 text-sm font-medium">Tax %</th>
                <th className="text-left py-2 px-2 text-sm font-medium">Total</th>
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
                    <input
                      type="number"
                      value={item.rate}
                      onChange={(e) => handleLineItemChange(index, 'rate', Number(e.target.value))}
                      className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                      min="0"
                      step="0.01"
                    />
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
                  <td className="py-2 px-2 text-sm font-semibold">
                    ₹ {item.total_amount.toLocaleString('en-IN')}
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
    </div>
  );
}