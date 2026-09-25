export const generateQuotation = (customer: any) => {
  const capacity = customer?.total_capacity_kw || '3';
  const panelQty = customer?.panel_quantity || '6';
  const inverterCapacity = customer?.inverter_capacity || '5';
  const totalPrice = customer?.quotation_price || '2,10,000';
  const priceInWords = customer?.quotation_price_words || 'Two Lakh Ten Thousand';

  return `
    <style>
      .quotation-header {
        background: linear-gradient(to bottom, #0066cc, #004d99);
        color: white;
        padding: 20px;
        text-align: center;
        margin-bottom: 20px;
      }
      .quotation-table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
      }
      .quotation-table th {
        background-color: #d3d3d3;
        border: 1px solid #000;
        padding: 8px;
        text-align: left;
        font-weight: bold;
      }
      .quotation-table td {
        border: 1px solid #000;
        padding: 8px;
      }
    </style>

    <div class="quotation-header">
      <h2 style="margin: 0; font-size: 16px; font-weight: bold;">TEJO BHARAT GLOBAL ENERGY LLP</h2>
      <p style="margin: 3px 0; font-size: 11px; font-weight: bold;">Regd. Office: Plot No. 28, Pragathi Nagar, Moosapet,</p>
      <p style="margin: 3px 0; font-size: 11px; font-weight: bold;">Hyderabad – 500018, Telangana, India</p>
      <p style="margin: 3px 0; font-size: 11px; font-weight: bold;">Email: contact@tejobharat.com | Phone: +91-9948783992</p>
      <p style="margin: 3px 0; font-size: 11px; font-weight: bold;">LLPIN: ACQ-2334 | PAN: AAYFT4513H</p>
      <p style="margin: 3px 0; font-size: 11px; font-weight: bold;">GSTIN: 36AAYFT4513H1ZQ</p>
      <p style="margin: 3px 0; font-size: 11px; font-weight: bold;">Website: www.tejobharat.com</p>
    </div>

    <p style="text-align: right; font-size: 12px; margin: 15px 0; font-weight: bold;">Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

    <p style="font-size: 12px; margin: 10px 0;">Dear <strong>${customer?.customer_name || '[Customer Name]'}</strong></p>
    <p style="font-size: 12px; margin: 5px 0;"><strong>Ref:</strong> Your Requirement of Solar Products solar GT-${capacity}.0KWP</p>
    <p style="font-size: 12px; margin: 10px 0;">Dear Sir/Madam,</p>
    <p style="font-size: 12px; margin: 5px 0;">Thank you for the enquiry for your requirement of Solar products.</p>
    <p style="font-size: 12px; margin: 5px 0 15px 0;">We are pleased to offer our best prices and other terms & conditions of sale as below.</p>

    <table class="quotation-table" style="font-size: 12px;">
      <thead>
        <tr>
          <th style="width: 10%;">SI.No</th>
          <th style="width: 40%;">Item Description</th>
          <th style="width: 10%;">Qty</th>
          <th style="width: 20%;">Unit Price (INR)</th>
          <th style="width: 20%;">Total Basic Price (INR)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align: center;">1</td>
          <td><strong>Solar GT-${capacity}.0kwp</strong></td>
          <td style="text-align: center;">1</td>
          <td style="text-align: right;">${totalPrice}</td>
          <td style="text-align: right;">${totalPrice}</td>
        </tr>
        <tr>
          <td colspan="2"></td>
          <td colspan="2" style="text-align: right; font-weight: bold;">GST</td>
          <td style="text-align: right; font-weight: bold;">Including GST</td>
        </tr>
        <tr>
          <td colspan="2"></td>
          <td colspan="2" style="text-align: right; font-weight: bold;">Customer price (including GST)</td>
          <td style="text-align: right; font-weight: bold;">${totalPrice}</td>
        </tr>
      </tbody>
    </table>

    <p style="font-size: 12px; margin: 15px 0 5px 0;"><strong>NOTE : Transportation & installation including.</strong></p>
    <p style="font-size: 12px; margin: 5px 0;"><strong>Total basic value :</strong> ${priceInWords} only</p>

    <p style="font-size: 12px; margin: 15px 0 5px 0;"><strong>Payment Terms:</strong> 75% advance along with PO, Material delivery 15% ,After Installation 10%</p>

    <p style="font-size: 12px; margin: 15px 0 5px 0; font-weight: bold;">TEJO BHARAT GLOBAL ENERGY LLP,</p>
    <p style="font-size: 12px; margin: 3px 0;"><strong>BANK: KOTAK BANK, BRANCH: KPHB BRANCH, HYDERABAD A/C NO:9989279586,</strong></p>
    <p style="font-size: 12px; margin: 3px 0;"><strong>IFSC: KKBK0007475</strong></p>

    <div style="margin-top: 40px;">
      <p style="font-size: 12px; margin: 3px 0; font-weight: bold;">B B S Jyothsana</p>
      <p style="font-size: 12px; margin: 3px 0;">Manager-Operation & Sales</p>
      <p style="font-size: 12px; margin: 3px 0;">Mobile: 947979794</p>
    </div>

    <div style="page-break-before: always;"></div>

    <div class="quotation-header">
      <h2 style="margin: 0; font-size: 16px; font-weight: bold;">TEJO BHARAT GLOBAL ENERGY LLP</h2>
      <p style="margin: 3px 0; font-size: 11px; font-weight: bold;">Regd. Office: Plot No. 28, Pragathi Nagar, Moosapet,</p>
      <p style="margin: 3px 0; font-size: 11px; font-weight: bold;">Hyderabad – 500018, Telangana, India</p>
      <p style="margin: 3px 0; font-size: 11px; font-weight: bold;">Email: contact@tejobharat.com | Phone: +91-9948783992</p>
      <p style="margin: 3px 0; font-size: 11px; font-weight: bold;">LLPIN: ACQ-2334 | PAN: AAYFT4513H</p>
      <p style="margin: 3px 0; font-size: 11px; font-weight: bold;">GSTIN: 36AAYFT4513H1ZQ</p>
      <p style="margin: 3px 0; font-size: 11px; font-weight: bold;">Website: www.tejobharat.com</p>
    </div>

    <h3 style="font-size: 13px; font-weight: bold; margin: 20px 0 10px 0;">Key components of the Rooftop Solar system</h3>

    <table class="quotation-table" style="font-size: 11px;">
      <thead>
        <tr>
          <th style="width: 30%;">Item</th>
          <th style="width: 40%;">Description</th>
          <th style="width: 10%;">Qty</th>
          <th style="width: 10%;">Unit Price</th>
          <th style="width: 10%;">Amount (INR)</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background-color: #e8e8e8;">
          <td><strong>DCR Solar Panel</strong></td>
          <td>High-efficiency DCR, BIS & ALMM Approved</td>
          <td>${panelQty} Nos</td>
          <td>Included</td>
          <td>Included</td>
        </tr>
        <tr style="background-color: #e8e8e8;">
          <td><strong>On-grid Solar Inverter</strong></td>
          <td>${inverterCapacity}kW, with intelligent monitoring</td>
          <td>1 Set</td>
          <td>Included</td>
          <td>Included</td>
        </tr>
        <tr style="background-color: #e8e8e8;">
          <td><strong>ACDB, DCDB, Earthing kit, Protection Panels, SPD, Isolators, Earthing, Lightning Arrestor</strong></td>
          <td>Complete protection & safety kit</td>
          <td>1 Set</td>
          <td>Included</td>
          <td>Included</td>
        </tr>
        <tr style="background-color: #e8e8e8;">
          <td><strong>Mounting Structures & Accessories</strong></td>
          <td>GI / Aluminium</td>
          <td>1 Set</td>
          <td>Included</td>
          <td>Included</td>
        </tr>
        <tr style="background-color: #e8e8e8;">
          <td><strong>DC/AC cables, Connectors, Lugs</strong></td>
          <td>Sufficient for installation</td>
          <td>1 Set</td>
          <td>Included</td>
          <td>Included</td>
        </tr>
        <tr style="background-color: #e8e8e8;">
          <td><strong>Installation & Commissioning</strong></td>
          <td>Complete, as per MNRE/DISCOM norms</td>
          <td>1 Job</td>
          <td>Included</td>
          <td>Included</td>
        </tr>
        <tr>
          <td colspan="4" style="text-align: right; font-weight: bold;">Total Price (INR): ₹${totalPrice}</td>
          <td></td>
        </tr>
        <tr>
          <td colspan="5" style="font-weight: bold;">(Rupees ${priceInWords} only)</td>
        </tr>
      </tbody>
    </table>

    <h3 style="font-size: 12px; font-weight: bold; margin: 20px 0 10px 0;">Scope of Work-Supply& services</h3>
    <p style="font-size: 11px; margin: 5px 0;">Supply, packing and forwarding, transportation, unloading, erection & testing of:</p>
    <ul style="font-size: 11px; margin: 5px 0 15px 20px;">
      <li>Solar Modules – of required capacity</li>
      <li>Combiner Boxes, Junction boxes, Cables , etc</li>
      <li>Solar inverters</li>
      <li>Web monitoring -WIFI</li>
      <li>AC cables up to the AC Combiner Box</li>
      <li>Installation & Testing of the Rooftop Solar system</li>
      <li>Project management</li>
    </ul>

    <h3 style="font-size: 12px; font-weight: bold; margin: 20px 0 10px 0;">Customer scope</h3>
    <p style="font-size: 11px; margin: 5px 0;">The following items shall be customer scope:</p>
    <ol style="font-size: 11px; margin: 5px 0 15px 20px;">
      <li>Safe storage of material</li>
      <li>AC Cables from existing LT Panel to Solar AC Combiner box & Earthing,</li>
      <li>All Civil Works---If required</li>
      <li>provision of parapet walls for RCC roofs / staircase for roof access & support railing for galvalume roofs.</li>
      <li>Approvals & Net Meter cost is customer scope only.</li>
      <li>Electricity and water supply at site will be provided by customers free of cost during installation.</li>
    </ol>
  `;
};
