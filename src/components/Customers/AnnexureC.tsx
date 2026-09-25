export const generateAnnexureC = (customer: any) => {
  return `
    <div style="text-align: right; margin-bottom: 3px;">
      <p style="font-weight: bold; font-size: 11px; margin: 0;">Annexure-C</p>
    </div>

    <p style="text-align: center; font-weight: bold; font-size: 11px; margin: 3px 0; text-decoration: underline;">
      Project Completion Report for Grid-Connected Rooftop
    </p>

    <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 10px;">
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Sanction Letter No.:</strong></td>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;">${customer?.sanction_letter_number || ''}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Proposal Title:</strong></td>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;">Solar Power Plant ${customer?.total_capacity_kw || ''}Kw</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>SC No.</strong></td>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;">${customer?.consumer_number || ''}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Installed by Vendor:</strong></td>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;">Veera Vijaya Solar Systems</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Title of the Project:</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">Solar Power Plant</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>SPV Capacity (kWp):</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.total_capacity_kw || ''} KW</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Category of the<br/>organization/beneficiary:</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">I C (Domestic)</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Name of the contact person:</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.customer_name || ''}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Address of contact person:</strong></td>
        <td colspan="3" style="padding: 3px; border: 1px solid #000;">
          ${customer?.customer_name || ''}<br/>
          D.No: ${customer?.address || ''}, ${customer?.district || ''} District, Andhra Pradesh-${customer?.pincode || ''}
        </td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>State:</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">Andhra Pradesh</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>District/City:</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.district || ''} District</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Mobile:</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.phone || ''}</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Email:</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.email || ''}</td>
      </tr>
      <tr>
        <td colspan="2" rowspan="2" style="padding: 3px; border: 1px solid #000; vertical-align: top;"><strong>Aadhaar Card Number<br/>(For Residential)</strong></td>
        <td rowspan="2" style="padding: 3px; border: 1px solid #000; vertical-align: top;">${customer?.aadhar_number || ''}</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Latitude:</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.latitude || ''}</td>
      </tr>
      <tr>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Longitude:</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.longitude || ''}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>DISCOM</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">APEPDCL</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Sanction Load</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.sanction_load_kw || ''} kw</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>CA No.</strong></td>
        <td colspan="3" style="padding: 3px; border: 1px solid #000;">${customer?.ca_number || ''}</td>
      </tr>
    </table>

    <p style="font-weight: bold; font-size: 10px; margin: 6px 0 2px 0;">Technology Description & System Design / Specification</p>
    <p style="font-weight: bold; font-size: 10px; margin: 0 0 3px 0;">(Compliance to BIS/IEC Standards is mandatory)</p>

    <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 10px;">
      <tr>
        <td colspan="4" style="padding: 3px; border: 1px solid #000; font-weight: bold;">1.Solar PV Module:</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;">Power of each PV Module / Nos.(Wp)* / Make</td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.panel_wattage || ''} Wp</td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.panel_quantity || ''} nos</td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.panel_brand || ''}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;">Cumulative Capacity of Modules (KWp):</td>
        <td colspan="3" style="padding: 3px; border: 1px solid #000;">${customer?.total_capacity_kw || ''} KWp</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;">Solar cell technology:</td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.panel_technology || 'TOPCON'}</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Tilt Angle of Modules:</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.tilt_angle || '19°'} towards South</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;">Module efficiency(in%):</td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.module_efficiency || '22'} %</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Azimuth</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.azimuth || '180°'}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;">Indigenous or imported(Cell)</td>
        <td colspan="3" style="padding: 3px; border: 1px solid #000;">${customer?.cell_origin || 'Imported'}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;">RFID passed inside or outside:</td>
        <td colspan="3" style="padding: 3px; border: 1px solid #000;">${customer?.rfid_location || 'Pasted Inside'}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;">Indigenous or imported(Module)</td>
        <td colspan="3" style="padding: 3px; border: 1px solid #000;">${customer?.module_origin || 'Indigenous'}</td>
      </tr>
      <tr>
        <td colspan="5" style="padding: 3px; border: 1px solid #000; font-style: italic;">* Supported by Appropriate documentation</td>
      </tr>
      <tr>
        <td colspan="4" style="padding: 3px; border: 1px solid #000; font-weight: bold;">2.Inverters:</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;">Type of inverter:</td>
        <td colspan="3" style="padding: 3px; border: 1px solid #000;">Solar Grid Connected Inverter</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;">Power of each PCU/Nos. of inverters (KVA)* /Make</td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.inverter_capacity || ''} KVA</td>
        <td style="padding: 3px; border: 1px solid #000;">One Number</td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.inverter_brand || ''}</td>
      </tr>
      <tr>
        <td colspan="2" rowspan="2" style="padding: 3px; border: 1px solid #000; vertical-align: top;">Capacity/Power of PCU/inverters (KVA) :</td>
        <td rowspan="2" style="padding: 3px; border: 1px solid #000; vertical-align: top;">${customer?.inverter_capacity || ''} kw</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Type of Charge Controller /MPPT</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">MPPT</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Inverter efficiency(in%)</strong> ${customer?.inverter_efficiency || '98'} %</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Grid connectivity level phase</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">Three Phase</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Grid connectivity level Voltage</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">220V</td>
      </tr>
      <tr>
        <td colspan="4" style="padding: 3px; border: 1px solid #000; font-weight: bold;">3.Mounting Structures</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Type</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">Fixed</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Surface Finish</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">Galvanized</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Material</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">MS Hot Dip Galvanized</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Wind Speed Tolerance</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">150 KMPH</td>
      </tr>
      <tr>
        <td colspan="4" style="padding: 3px; border: 1px solid #000; font-weight: bold;">4.Cables:</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>DC Cable Make</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.dc_cable_make || 'Waacab'}</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Size</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.dc_cable_size || '4 Sq mm'}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>AC Cable Make (Inverter to ACDB)</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.ac_cable_make || 'Waacab'}</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Size</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.ac_cable_size || '4 Sq mm'}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>AC Cable Make (ACDB to Electric Panel)</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.ac_cable_make_2 || 'Waacab'}</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Size</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">${customer?.ac_cable_size_2 || '4 Sq mm'}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Conductor</strong></td>
        <td colspan="3" style="padding: 3px; border: 1px solid #000;"><strong>Insulation/ sheath</strong> PVC/XLPE</td>
      </tr>
      <tr>
        <td colspan="4" style="padding: 3px; border: 1px solid #000; font-weight: bold;">5.JUNCTIONBOX & DISTRIBUTION BOARDS</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>ACDB</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">32 Amps</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Nos.</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">One</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>DCDB</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">2 in 2 out</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Nos.</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">One</td>
      </tr>
      <tr>
        <td colspan="4" style="padding: 3px; border: 1px solid #000; font-weight: bold;">6.EARTHING & LIGHTNING PROTECTION</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000; font-weight: bold;">EQUIPMENT EARTHING</td>
        <td colspan="3" style="padding: 3px; border: 1px solid #000;">One</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>AC(Nos.)</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">One</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Earth Resistance</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">2.0 Ohms</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>DC(Nos.)</strong></td>
        <td colspan="3" style="padding: 3px; border: 1px solid #000;"><strong>Earth Resistance</strong> 2.0 Ohms</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000; font-weight: bold;">LIGHTNING ARRESTORS (LA)</td>
        <td colspan="3" style="padding: 3px; border: 1px solid #000;"></td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Type</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">Franklin type with spikes</td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>LA (Nos.)</strong></td>
        <td style="padding: 3px; border: 1px solid #000;">One</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Earth Resistance</strong></td>
        <td colspan="3" style="padding: 3px; border: 1px solid #000;">2.0 Ohms</td>
      </tr>
      <tr>
        <td colspan="4" style="padding: 3px; border: 1px solid #000; font-weight: bold;">7.Online Monitoring Mechanism:</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Web Portal:</strong></td>
        <td colspan="3" style="padding: 3px; border: 1px solid #000;"></td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>USERID:</strong></td>
        <td colspan="3" style="padding: 3px; border: 1px solid #000;"><strong>Password:</strong></td>
      </tr>
      <tr>
        <td colspan="4" style="padding: 3px; border: 1px solid #000; font-weight: bold;">8.Weather monitoring:</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Solar Irradiance (Pyranomerter - Class IInd or better)</strong></td>
        <td style="padding: 3px; border: 1px solid #000;"><strong>Temperature</strong></td>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;">Ambient &Module</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;"><strong>Wind speed sensor</strong></td>
        <td colspan="3" style="padding: 3px; border: 1px solid #000;"></td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000; font-weight: bold;">9.Fire Fighting Device/System</td>
        <td style="padding: 3px; border: 1px solid #000;">Apex Fire</td>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;">Ammonium Phosphate dry powder</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 3px; border: 1px solid #000; font-weight: bold;">10.Danger Board</td>
        <td style="padding: 3px; border: 1px solid #000;">Solar Systems</td>
        <td colspan="2" style="padding: 3px; border: 1px solid #000;">PVC</td>
      </tr>
    </table>

    <div style="margin-top: 30px;">
      <p style="float: left; font-size: 10px; margin: 0;"><strong>Date:</strong></p>
      <p style="float: right; font-size: 10px; margin: 0;"><strong>(Signature of Vendor)<br/>With Stamp</strong></p>
      <div style="clear: both;"></div>
    </div>
  `;
};
