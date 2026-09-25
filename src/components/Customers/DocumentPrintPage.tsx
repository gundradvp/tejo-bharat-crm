import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, FileText, Printer, Download } from 'lucide-react';
import { generateAnnexureC } from './AnnexureC';
import { generateAgreement } from './Agreement';
import { generateQuotation } from './Quotation';

interface Customer {
  id: string;
  customer_name: string;
  consumer_number: string;
  phone: string;
  email?: string;
  address?: string;
  district?: string;
  [key: string]: any;
}

export default function DocumentPrintPage() {
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

  const handleDownloadPDF = (documentType: string) => {
    let content = '';
    let title = '';

    switch (documentType) {
      case 'annexure_a':
        content = generateAnnexureA();
        title = 'Annexure-A';
        break;
      case 'annexure_c':
        content = generateAnnexureC();
        title = 'Annexure-C';
        break;
      case 'grounding_certificate':
        content = generateGroundingCertificate();
        title = 'Grounding Certificate';
        break;
      case 'sync_certificate':
        content = generateSyncCertificate();
        title = 'Synchronisation Certificate';
        break;
      case 'agreement':
        content = generateAgreement();
        title = 'Installation Agreement';
        break;
      default:
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Document</title>
          <style>
            @page {
              margin: 0.3in 0.5in;
              size: A4;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 15px 30px;
              line-height: 1.4;
              font-size: 12px;
              background: white;
            }
            h1 {
              text-align: center;
              margin-bottom: 15px;
              font-size: 16px;
            }
            .section {
              margin: 15px 0;
            }
            .field {
              margin: 8px 0;
              display: flex;
            }
            .field label {
              font-weight: bold;
              width: 200px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 5px 0;
            }
            td {
              padding: 6px;
              border: 1px solid #000;
            }
            .page-break {
              page-break-before: always;
            }
            .avoid-break {
              page-break-inside: avoid;
            }
            @media print {
              @page {
                margin: 0.3in 0.5in;
              }
              body {
                padding: 10px 20px;
              }
              table {
                page-break-inside: auto;
              }
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
            }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }, 250);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handlePrint = (documentType: string) => {
    if (!customer) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let content = '';

    switch (documentType) {
      case 'annexure_a':
        content = generateAnnexureA();
        break;
      case 'annexure_c':
        content = generateAnnexureC(customer);
        break;
      case 'grounding_certificate':
        content = generateGroundingCertificate();
        break;
      case 'sync_certificate':
        content = generateSyncCertificate();
        break;
      case 'agreement':
        content = generateAgreement(customer);
        break;
      default:
        content = '<p>Document template not available</p>';
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Document</title>
          <style>
            @page {
              margin: 0.3in 0.5in;
              size: A4;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              padding: 15px 30px;
              line-height: 1.3;
              font-size: 11px;
            }
            h1 {
              text-align: center;
              margin-bottom: 15px;
              font-size: 16px;
            }
            .field {
              margin: 8px 0;
            }
            .field label {
              font-weight: bold;
              display: inline-block;
              width: 200px;
            }
            .section {
              margin: 15px 0;
            }
            .section h2 {
              border-bottom: 2px solid #333;
              padding-bottom: 8px;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 5px 0;
            }
            td {
              padding: 6px;
              border: 1px solid #000;
            }
            .page-break {
              page-break-before: always;
            }
            .avoid-break {
              page-break-inside: avoid;
            }
            @media print {
              @page {
                margin: 0.3in 0.5in;
              }
              body {
                padding: 10px 20px;
              }
              table {
                page-break-inside: auto;
              }
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
            }
          </style>
        </head>
        <body>
          ${content}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const generateAnnexureA = () => {
    const panelSerials = customer?.panel_serial_numbers || [];

    const generatePanelTable = () => {
      if (panelSerials.length === 0) {
        return '<table style="width: 100%; border-collapse: collapse; margin: 3px 0;"><tr><td style="border: 1px solid #000; padding: 5px; font-size: 11px;"></td><td style="border: 1px solid #000; padding: 5px; font-size: 11px;"></td><td style="border: 1px solid #000; padding: 5px; font-size: 11px;"></td></tr><tr><td style="border: 1px solid #000; padding: 5px; font-size: 11px;"></td><td style="border: 1px solid #000; padding: 5px; font-size: 11px;"></td><td style="border: 1px solid #000; padding: 5px; font-size: 11px;"></td></tr></table>';
      }

      const columnsPerRow = panelSerials.length >= 8 ? 4 : 3;
      let rows = '';

      for (let i = 0; i < panelSerials.length; i += columnsPerRow) {
        rows += '<tr>';
        for (let j = 0; j < columnsPerRow; j++) {
          rows += '<td style="border: 1px solid #000; padding: 5px; font-size: 11px;">' + (panelSerials[i + j] || '') + '</td>';
        }
        rows += '</tr>';
      }

      return '<table style="width: 100%; border-collapse: collapse; margin: 3px 0;">' + rows + '</table>';
    };

    const formatAddress = () => {
      const parts = [];
      if (customer?.customer_name) parts.push(customer.customer_name);
      if (customer?.address) parts.push(customer.address);
      if (customer?.district) parts.push(customer.district + ' District');

      const postalMatch = customer?.address?.match(/\d{6}/);
      if (postalMatch) parts.push(postalMatch[0]);

      return parts.join(', ');
    };

    return `
      <div style="text-align: right; margin-bottom: 8px;">
        <h1 style="font-weight: bold; font-size: 16px; margin: 0;">Annexure-A</h1>
      </div>

      <div style="text-align: center; margin-bottom: 12px;">
        <p style="font-weight: bold; font-size: 12px; margin: 2px 0;">
          Undertaking/Self- Declaration for domestic content requirement fulfillment (On
        </p>
        <p style="font-weight: bold; font-size: 12px; margin: 2px 0;">a plain Paper)</p>
      </div>

      <div style="line-height: 1.4; font-size: 11px;">
        <p style="text-align: justify; margin-bottom: 8px;">
          This is to certify that <strong>M/s Tejo Bharat Global Energy LLP</strong> has installed <strong>${customer?.total_capacity_kw || '___'} KW</strong> Grid Connected Rooftop Solar PV Power Plant for <strong>${formatAddress()}</strong>.
        </p>

        <p style="margin-bottom: 8px; padding-left: 20px;">
          under sanction number……………………date issued by APEPDCL
        </p>

        <p style="margin-bottom: 6px;">
          2. It is hereby undertaken that the PV modules installed for the above-mentioned project are domestically manufactured using domestic manufactured solar cells. The details of installed PV Modules are follows:
        </p>

        <div style="margin-left: 30px; margin-bottom: 10px;">
          <table style="width: 100%; border-collapse: collapse; margin: 3px 0; border: 1px solid #000;">
            <tr>
              <td style="width: 40%; padding: 5px; border: 1px solid #000; font-size: 11px;">1. PV Module Capacity</td>
              <td style="width: 3%; text-align: center; padding: 5px; border: 1px solid #000; font-size: 11px;">:</td>
              <td style="padding: 5px; border: 1px solid #000; font-size: 11px;">${(customer?.panel_quantity || 0) * (customer?.panel_wattage || 0)} watt</td>
            </tr>
            <tr>
              <td style="padding: 5px; border: 1px solid #000; font-size: 11px;">2. Number of PV Modules</td>
              <td style="text-align: center; padding: 5px; border: 1px solid #000; font-size: 11px;">:</td>
              <td style="padding: 5px; border: 1px solid #000; font-size: 11px;">${customer?.panel_quantity || '___'} Nos.</td>
            </tr>
            <tr>
              <td style="padding: 5px; border: 1px solid #000; vertical-align: top; font-size: 11px;">3. Sr. No of PV Module</td>
              <td style="text-align: center; padding: 5px; border: 1px solid #000; vertical-align: top; font-size: 11px;">:</td>
              <td style="padding: 5px; border: 1px solid #000; font-size: 11px;"></td>
            </tr>
          </table>

          ${generatePanelTable()}

          <table style="width: 100%; border-collapse: collapse; margin: 3px 0; border: 1px solid #000;">
            <tr>
              <td style="width: 40%; padding: 5px; border: 1px solid #000; font-size: 11px;">4. PV Module Make</td>
              <td style="width: 3%; text-align: center; padding: 5px; border: 1px solid #000; font-size: 11px;">:</td>
              <td style="padding: 5px; border: 1px solid #000; font-size: 11px;">${customer?.panel_brand || '_______________'}.,</td>
            </tr>
            <tr>
              <td style="padding: 5px; border: 1px solid #000; font-size: 11px;">5. Purchase Order Number</td>
              <td style="text-align: center; padding: 5px; border: 1px solid #000; font-size: 11px;">:</td>
              <td style="padding: 5px; border: 1px solid #000; font-size: 11px;"></td>
            </tr>
            <tr>
              <td style="padding: 5px; border: 1px solid #000; font-size: 11px;">6. Purchase Order Date</td>
              <td style="text-align: center; padding: 5px; border: 1px solid #000; font-size: 11px;">:</td>
              <td style="padding: 5px; border: 1px solid #000; font-size: 11px;"></td>
            </tr>
            <tr>
              <td style="padding: 5px; border: 1px solid #000; font-size: 11px;">7. Cell manufacturer's name</td>
              <td style="text-align: center; padding: 5px; border: 1px solid #000; font-size: 11px;">:</td>
              <td style="padding: 5px; border: 1px solid #000; font-size: 11px;"></td>
            </tr>
            <tr>
              <td style="padding: 5px; border: 1px solid #000; font-size: 11px;">8. Cell GST invoice No</td>
              <td style="text-align: center; padding: 5px; border: 1px solid #000; font-size: 11px;">:</td>
              <td style="padding: 5px; border: 1px solid #000; font-size: 11px;"></td>
            </tr>
          </table>
        </div>

        <p style="margin-bottom: 8px; font-size: 11px;">
          3. The above undertaking is based on the certificate issued by PV Module manufacturer/supplier while supplying the above-mentioned order.
        </p>

        <p style="margin-bottom: 10px; text-align: justify; font-size: 11px;">
          4. I <strong>Durga Vara Prasad Gundra</strong> on behalf of <strong>M/s Tejo Bharat Global Energy LLP</strong> further declare that the information given above is true and correct and nothing has been concealed therein. If anything is found incorrect at any stage then the due Central Financial Assistance (CFA) that I have not charged from the consumer can be withheld and appropriate action may be taken against me and my company for wrong declaration. Supporting documents and proof of the above information will be provided as and when requested by MNRE.
        </p>
      </div>

      <div style="margin-top: 40px; text-align: right;">
        <p style="margin-bottom: 30px; font-size: 11px;">(Signature With official Seal)</p>
        <p style="margin: 2px 0; font-size: 11px;">For M/s Tejo Bharat Global Energy LLP</p>
        <p style="margin: 2px 0; font-size: 11px;">Name : Durga Vara Prasad Gundra</p>
        <p style="margin: 2px 0; font-size: 11px;">Designation : Manager Operations</p>
        <p style="margin: 2px 0; font-size: 11px;">Phone :9479797947</p>
        <p style="margin: 2px 0; font-size: 11px;">Email :durga@tejobharat.com</p>
      </div>
    `;
  };


  const generateGroundingCertificate = () => {
    return `
      <h1>GROUNDING CERTIFICATE</h1>

      <div class="section">
        <p>This is to certify that the solar power system installed at the premises of:</p>

        <div class="field"><label>Consumer Name:</label> ${customer?.customer_name || 'N/A'}</div>
        <div class="field"><label>Consumer Number:</label> ${customer?.consumer_number || 'N/A'}</div>
        <div class="field"><label>Address:</label> ${customer?.address || 'N/A'}</div>
      </div>

      <div class="section">
        <h3>System Details</h3>
        <div class="field"><label>System Capacity:</label> ${customer?.total_capacity_kw || 'N/A'} kW</div>
        <div class="field"><label>Inverter Brand:</label> ${customer?.inverter_brand || 'N/A'}</div>
        <div class="field"><label>Installation Date:</label> ${customer?.commissioning_date || 'N/A'}</div>
      </div>

      <div class="section">
        <h3>Grounding Details</h3>
        <div class="field"><label>Certificate Number:</label> ${customer?.grounding_certificate_number || 'N/A'}</div>
        <div class="field"><label>Certificate Date:</label> ${customer?.grounding_certificate_date || 'N/A'}</div>
      </div>

      <div class="section">
        <p>The grounding system has been installed and tested as per Indian Electricity Rules and standards.</p>
      </div>

      <div class="section" style="margin-top: 80px;">
        <div style="float: left;">
          <p>____________________<br>Signature of Installer</p>
        </div>
        <div style="float: right;">
          <p>____________________<br>Signature of Consumer</p>
        </div>
      </div>
    `;
  };

  const generateSyncCertificate = () => {
    return `
      <h1>SYNCHRONISATION CERTIFICATE</h1>

      <div class="section">
        <p>This is to certify that the solar power system has been successfully synchronized with the grid for:</p>

        <div class="field"><label>Consumer Name:</label> ${customer?.customer_name || 'N/A'}</div>
        <div class="field"><label>Consumer Number:</label> ${customer?.consumer_number || 'N/A'}</div>
        <div class="field"><label>Address:</label> ${customer?.address || 'N/A'}</div>
      </div>

      <div class="section">
        <h3>System Details</h3>
        <div class="field"><label>System Capacity:</label> ${customer?.total_capacity_kw || 'N/A'} kW</div>
        <div class="field"><label>Inverter Brand:</label> ${customer?.inverter_brand || 'N/A'}</div>
        <div class="field"><label>Inverter Capacity:</label> ${customer?.inverter_capacity || 'N/A'} kW</div>
        <div class="field"><label>Commissioning Date:</label> ${customer?.commissioning_date || 'N/A'}</div>
      </div>

      <div class="section">
        <h3>Synchronisation Details</h3>
        <div class="field"><label>Certificate Number:</label> ${customer?.sync_certificate_number || 'N/A'}</div>
        <div class="field"><label>Certificate Date:</label> ${customer?.sync_certificate_date || 'N/A'}</div>
      </div>

      <div class="section">
        <p>The system has been tested and is operating within prescribed parameters. Grid synchronization is successful.</p>
      </div>

      <div class="section" style="margin-top: 80px;">
        <div style="float: left;">
          <p>____________________<br>Authorized Signatory</p>
        </div>
        <div style="float: right;">
          <p>____________________<br>Consumer Signature</p>
        </div>
      </div>
    `;
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

  const documents = [
    { id: 'quotation', name: 'Quotation', description: 'Customer-Specific Quotation', route: `/customers/${id}/quotation` },
    { id: 'annexure_a', name: 'Annexure A', description: 'Consumer Application Details' },
    { id: 'annexure_c', name: 'Annexure C', description: 'Technical Specifications' },
    { id: 'grounding_certificate', name: 'Grounding Certificate', description: 'Earthing & Grounding Details' },
    { id: 'sync_certificate', name: 'Synchronisation Certificate', description: 'Grid Connection Certificate' },
    { id: 'agreement', name: 'Installation Agreement', description: 'Model Agreement Document' },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Print Documents</h1>
          <p className="text-gray-600">{customer.customer_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition-all group"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{doc.name}</h3>
                <p className="text-sm text-gray-600 mb-3">{doc.description}</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => doc.route ? navigate(doc.route) : handlePrint(doc.id)}
                    className="flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print</span>
                  </button>
                  {!doc.route && (
                    <button
                      onClick={() => handleDownloadPDF(doc.id)}
                      className="flex items-center gap-2 text-green-600 font-medium hover:text-green-700"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download PDF</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
