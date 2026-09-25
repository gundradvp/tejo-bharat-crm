interface QuotationData {
  quotationNo: string;
  quotationDate: string;
  expiryDate: string;
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  placeOfSupply: string;
  shipToName: string;
  shipToAddress: string;
  lineItems: LineItem[];
  bomItems: BOMItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  totalAmount: number;
  totalAmountWords: string;
  termsAndConditions: string;
}

interface LineItem {
  no: number;
  items: string;
  qty: string;
  rate: number;
  tax: number;
  taxRate: number;
  total: number;
}

interface BOMItem {
  sno: number;
  itemDescription: string;
  specifications: string;
  qty: string;
  make: string;
}

interface CompanySettings {
  company_name: string;
  company_logo_url?: string;
  header_background_color?: string;
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
}

export const generateEnhancedQuotationHTML = (
  quotation: QuotationData,
  companySettings: CompanySettings
): string => {
  const headerBgColor = companySettings.header_background_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

  const page1Content = `
    <div class="page-container" style="page-break-after: always; padding: 15px; font-family: Arial, sans-serif; border: 3px solid #d4af37; position: relative; background: white; box-sizing: border-box;">
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.03; background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\"><text x=\"50%\" y=\"50%\" font-size=\"120\" fill=\"%23d4af37\" text-anchor=\"middle\" transform=\"rotate(-45 100 100)\">${quotation.quotationNo.slice(-4)}</text></svg>'); background-repeat: repeat; background-size: 300px 300px; pointer-events: none;"></div>

      <div style="position: relative; z-index: 1;">
        <div style="text-align: center; padding: 20px; background: ${headerBgColor}; color: white; border-radius: 0; margin: -15px -15px 15px -15px;">
          ${companySettings.company_logo_url ? `
            <div style="margin-bottom: 10px;">
              <img src="${companySettings.company_logo_url}" alt="${companySettings.company_name}" style="max-height: 60px; max-width: 180px; object-fit: contain; margin: 0 auto; display: block; background: white; padding: 8px; border-radius: 6px;" />
            </div>
          ` : ''}
          <h1 style="margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 1px;">${companySettings.company_name || 'COMPANY NAME'}</h1>
          <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 15px; border-radius: 15px; margin: 10px 0;">
            <span style="font-size: 11px; font-weight: bold;">Pan No</span> ${companySettings.pan_number || ''} | <span style="font-weight: bold;">GSTIN</span> ${companySettings.gstin || ''}
          </div>
          <div style="font-size: 11px; margin-top: 10px; line-height: 1.5;">
            <div style="margin: 2px 0;">${companySettings.company_phone || ''} | ${companySettings.company_email || ''}</div>
            <div style="margin: 2px 0; font-weight: 600;">REGD. OFFICE: ${companySettings.company_address || ''}</div>
            <div style="margin: 2px 0; font-weight: 600;">website: ${companySettings.company_website || ''}</div>
          </div>
        </div>

        <div style="position: absolute; top: 20px; right: 20px; background: white; padding: 10px 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 2;">
          <div style="font-size: 18px; font-weight: bold; color: #667eea;">QUOTATION</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin: 15px 0; background: #f8f9fa; padding: 10px; border-radius: 6px;">
          <div>
            <div style="margin: 3px 0; font-size: 13px;"><strong>Quotation No.:</strong> ${quotation.quotationNo}</div>
            <div style="margin: 3px 0; font-size: 13px;"><strong>Date:</strong> ${quotation.quotationDate}</div>
          </div>
          <div style="text-align: right;">
            <div style="margin: 3px 0; font-size: 13px;"><strong>Expiry:</strong></div>
            <div style="margin: 3px 0; font-size: 13px;">${quotation.expiryDate}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
          <div style="background: #fff3cd; padding: 10px; border-radius: 6px; border-left: 3px solid #ffc107;">
            <div style="font-size: 12px; font-weight: bold; color: #856404; margin-bottom: 6px;">Bill To</div>
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 3px;">${quotation.customerName}</div>
            <div style="font-size: 11px; margin: 2px 0;"><strong>Mobile:</strong> ${quotation.customerMobile}</div>
            <div style="font-size: 11px; margin: 2px 0;"><strong>Place of Supply:</strong> ${quotation.placeOfSupply}</div>
          </div>
          <div style="background: #d1ecf1; padding: 10px; border-radius: 6px; border-left: 3px solid #17a2b8;">
            <div style="font-size: 12px; font-weight: bold; color: #0c5460; margin-bottom: 6px;">Ship To</div>
            <div style="font-weight: bold; font-size: 14px;">${quotation.shipToName}</div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 15px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); font-size: 12px;">
          <thead>
            <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd; width: 5%;">No</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #ddd; width: 50%;">Items</th>
              <th style="padding: 8px; text-align: center; border: 1px solid #ddd; width: 10%;">Qty.</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #ddd; width: 12%;">Rate</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #ddd; width: 10%;">Tax</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #ddd; width: 13%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${quotation.lineItems.map((item, index) => `
              <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${item.no}</td>
                <td style="padding: 6px; border: 1px solid #ddd;">${item.items}</td>
                <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${item.qty}</td>
                <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">₹ ${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">₹ ${item.tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}<br/><span style="font-size: 9px; color: #666;">(${item.taxRate}%)</span></td>
                <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold;">₹ ${item.total.toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
            <tr style="background: #e9ecef;">
              <td colspan="5" style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 14px;">SUBTOTAL</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 14px;">₹ ${quotation.subtotal.toLocaleString('en-IN')}</td>
            </tr>
          </tbody>
        </table>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
          <div style="background: #f8f9fa; padding: 12px; border-radius: 6px;">
            <div style="font-weight: bold; font-size: 12px; margin-bottom: 8px; color: #495057;">Terms & Conditions</div>
            <div style="font-size: 10px; line-height: 1.4; color: #6c757d;">
              ${quotation.termsAndConditions.split('\n').map(line => `<div style="margin: 4px 0;">${line}</div>`).join('')}
            </div>
          </div>
          <div>
            <div style="background: white; border: 2px solid #e9ecef; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px;">
                <span><strong>Taxable Amount</strong></span>
                <span>₹ ${(quotation.subtotal - quotation.cgst - quotation.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; color: #666;">
                <span>CGST @${companySettings.cgst_rate}%</span>
                <span>₹ ${quotation.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; color: #666;">
                <span>SGST @${companySettings.sgst_rate}%</span>
                <span>₹ ${quotation.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style="border-top: 2px solid #667eea; margin: 8px 0; padding-top: 8px;">
                <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #667eea;">
                  <span>Total Amount</span>
                  <span>₹ ${quotation.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
            <div style="background: #d4edda; border: 2px solid #c3e6cb; border-radius: 6px; padding: 10px; font-size: 11px; font-weight: 600; color: #155724;">
              <div><strong>Total Amount (in words)</strong></div>
              <div style="margin-top: 4px;">${quotation.totalAmountWords}</div>
            </div>
          </div>
        </div>

        <div class="no-break" style="margin: 15px 0; padding: 12px; background: #f8f9fa; border-radius: 6px;">
          <div style="font-weight: bold; margin-bottom: 6px; font-size: 12px;">Bank Details</div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 11px;">
            <div><strong>Name:</strong> ${companySettings.company_name || ''}</div>
            <div><strong>IFSC:</strong> ${companySettings.bank_ifsc_code || ''}</div>
            <div><strong>Account No:</strong> ${companySettings.bank_account_number || ''}</div>
            <div><strong>Bank Name:</strong> ${companySettings.bank_name || ''}, ${companySettings.bank_branch || ''}</div>
          </div>
        </div>

        <div class="no-break" style="text-align: right; margin-top: 20px; padding: 15px 0;">
          <div style="display: inline-block; text-align: center;">
            <div style="border-bottom: 2px solid #333; padding-bottom: 4px; margin-bottom: 4px; min-width: 180px; font-size: 11px;">Signature</div>
            <div style="font-weight: bold; font-size: 12px;">${companySettings.company_name || ''}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const bomPageContent = quotation.bomItems.length > 0 ? `
    <div style="page-break-before: always; max-width: 900px; margin: 40px auto 0; padding: 20px; font-family: Arial, sans-serif; border: 2px solid #d4af37; position: relative;">
      <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; opacity: 0.03; background-image: url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"200\" height=\"200\"><text x=\"50%\" y=\"50%\" font-size=\"120\" fill=\"%23d4af37\" text-anchor=\"middle\" transform=\"rotate(-45 100 100)\">BOM</text></svg>'); background-repeat: repeat; background-size: 300px 300px; pointer-events: none;"></div>

      <div style="position: relative; z-index: 1;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; margin-bottom: 30px;">
          <h2 style="margin: 0; font-size: 24px;">Bill of Materials</h2>
          <div style="font-size: 13px; margin-top: 8px;">Detailed Specifications</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <thead>
            <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
              <th style="padding: 12px; text-align: center; border: 1px solid #ddd; width: 8%;">S.No</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd; width: 25%;">Item Description</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd; width: 32%;">Specifications</th>
              <th style="padding: 12px; text-align: center; border: 1px solid #ddd; width: 15%;">Qty</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #ddd; width: 20%;">Make</th>
            </tr>
          </thead>
          <tbody>
            ${quotation.bomItems.map((item, index) => `
              <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#f8f9fa'};">
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #667eea;">${item.sno}</td>
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: 600;">${item.itemDescription}</td>
                <td style="padding: 12px; border: 1px solid #ddd; font-size: 13px;">${item.specifications}</td>
                <td style="padding: 12px; border: 1px solid #ddd; text-align: center;">${item.qty}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${item.make}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
          <div style="font-weight: bold; margin-bottom: 10px; font-size: 14px;">Terms & Conditions</div>
          <div style="font-size: 12px; line-height: 1.6; color: #6c757d;">
            ${quotation.termsAndConditions.split('\n').map(line => `<div style="margin: 8px 0;">${line}</div>`).join('')}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 25px 0;">
          <div>
            <div style="background: white; border: 2px solid #e9ecef; border-radius: 8px; padding: 15px;">
              <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px;">
                <span><strong>Taxable Amount</strong></span>
                <span>₹ ${(quotation.subtotal - quotation.cgst - quotation.sgst).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; color: #666;">
                <span>CGST @${companySettings.cgst_rate}%</span>
                <span>₹ ${quotation.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; color: #666;">
                <span>SGST @${companySettings.sgst_rate}%</span>
                <span>₹ ${quotation.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style="border-top: 2px solid #667eea; margin: 12px 0; padding-top: 12px;">
                <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold; color: #667eea;">
                  <span>Total Amount</span>
                  <span>₹ ${quotation.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div style="background: #d4edda; border: 2px solid #c3e6cb; border-radius: 8px; padding: 15px;">
              <div style="font-weight: bold; margin-bottom: 8px;">Total Amount (in words)</div>
              <div style="font-size: 14px; color: #155724;">${quotation.totalAmountWords}</div>
            </div>
            <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
              <div style="font-weight: bold; margin-bottom: 8px; font-size: 13px;">Bank Details</div>
              <div style="font-size: 12px; line-height: 1.6;">
                <div><strong>Name:</strong> ${companySettings.company_name || ''}</div>
                <div><strong>IFSC:</strong> ${companySettings.bank_ifsc_code || ''}</div>
                <div><strong>Account No:</strong> ${companySettings.bank_account_number || ''}</div>
                <div><strong>Bank:</strong> ${companySettings.bank_name || ''}</div>
              </div>
            </div>
          </div>
        </div>

        <div style="text-align: right; margin-top: 40px; padding: 20px 0;">
          <div style="display: inline-block; text-align: center;">
            <div style="border-bottom: 2px solid #333; padding-bottom: 5px; margin-bottom: 5px; min-width: 200px;">Signature</div>
            <div style="font-weight: bold;">${companySettings.company_name || ''}</div>
          </div>
        </div>
      </div>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Quotation - ${quotation.customerName}</title>
        <meta charset="UTF-8">
        <style>
          * {
            box-sizing: border-box;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
            @page {
              size: A4;
              margin: 10mm;
            }
            .page-container {
              page-break-inside: avoid;
              page-break-after: always;
            }
            .no-break {
              page-break-inside: avoid;
            }
          }
          body {
            margin: 0;
            padding: 10px;
            background: #f5f5f5;
          }
        </style>
      </head>
      <body>
        ${page1Content}
        ${bomPageContent}
      </body>
    </html>
  `;
};