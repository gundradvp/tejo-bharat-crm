import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Printer } from 'lucide-react';
import { generateQuotation } from './Quotation';

interface Customer {
  id: string;
  customer_name: string;
  consumer_number: string;
  phone: string;
  email?: string;
  address?: string;
  district?: string;
  total_capacity_kw?: number;
  quotation_number?: string;
  quotation_date?: string;
  quotation_valid_until?: string;
  system_cost?: number;
  subsidy_amount?: number;
  net_payable?: number;
  gst_amount?: number;
  total_amount?: number;
  payment_terms?: string;
  installation_timeline?: string;
  warranty_details?: string;
  special_terms?: string;
  inverter_brand?: string;
  panel_brand?: string;
  panel_quantity?: number;
  panel_wattage?: number;
  [key: string]: any;
}

export default function QuotationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (id) {
      fetchCustomer();
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setCustomer(data);
    } catch (error: any) {
      console.error('Error fetching customer:', error);
      alert('Failed to load customer details');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!customer) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const quotationContent = generateQuotation(customer);

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quotation - ${customer.customer_name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              margin: 0;
            }
            @media print {
              body { padding: 10px; }
              .page-break { page-break-before: always; }
            }
          </style>
        </head>
        <body>
          ${quotationContent}
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading customer details...</div>
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotation Preview</h1>
          <p className="text-gray-600">{customer.customer_name}</p>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-200 rounded-lg p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-2">SOLAR INSTALLATION QUOTATION</h2>
          <p className="text-sm text-gray-600">PM Surya Ghar Solar Installation Services</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p><strong>Quotation No:</strong> {customer.quotation_number || 'Not Set'}</p>
            <p><strong>Date:</strong> {customer.quotation_date || 'Not Set'}</p>
            <p><strong>Valid Until:</strong> {customer.quotation_valid_until || 'Not Set'}</p>
          </div>
          <div className="text-right">
            <p><strong>Customer:</strong> {customer.customer_name}</p>
            <p>{customer.phone}</p>
            <p>{customer.email}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold mb-2">System Capacity:</h3>
          <p className="text-2xl font-bold text-blue-600">{customer.total_capacity_kw || 'N/A'} kW</p>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold mb-2">Cost Summary:</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>System Cost:</span>
              <span>₹ {customer.system_cost?.toLocaleString('en-IN') || '0.00'}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Subsidy:</span>
              <span>- ₹ {customer.subsidy_amount?.toLocaleString('en-IN') || '0.00'}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Net Amount:</span>
              <span>₹ {customer.net_payable?.toLocaleString('en-IN') || '0.00'}</span>
            </div>
            <div className="flex justify-between">
              <span>GST @ 12%:</span>
              <span>₹ {customer.gst_amount?.toLocaleString('en-IN') || '0.00'}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t-2 pt-2 mt-2">
              <span>Grand Total:</span>
              <span>₹ {customer.total_amount?.toLocaleString('en-IN') || '0.00'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Printer className="h-5 w-5" />
          Print Quotation
        </button>
      </div>
    </div>
  );
}
