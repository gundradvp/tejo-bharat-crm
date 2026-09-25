export const generateAgreement = (customer: any) => {
  return `
    <div style="text-align: center; margin-bottom: 15px;">
      <p style="font-weight: bold; font-size: 12px; margin: 0;">Annexure2</p>
    </div>

    <p style="text-align: center; font-weight: bold; font-size: 11px; margin: 5px 0;">
      Agreement between Consumer & Vendor for installation of grid connected rooftop solar (RTS)
    </p>
    <p style="text-align: center; font-weight: bold; font-size: 11px; margin: 0 0 10px 0;">
      project under PM – Surya Ghar: Muft Bijli Yojana
    </p>

    <p style="text-align: justify; font-size: 11px; margin: 10px 0;">
      This agreement is executed on -------(Day)------(Month)-------(Year) for design, supply, installation,
      commissioning and 5-year comprehensive maintenance of RTS project/system along with warranty
      under PM Surya Ghar: Muft Bijli Yojana
    </p>

    <p style="text-align: center; font-weight: bold; font-size: 11px; margin: 15px 0 10px 0;">Between</p>

    <p style="text-align: justify; font-size: 11px; margin: 10px 0;">
      <strong><u>${customer?.customer_name || 'Mr./Ms. [Consumer Name]'}, s/o [Father\'s Name]</u></strong> (Name of Consumer) having address at <strong><u>${customer?.address || '[Address]'},
      ${customer?.district || '[District]'} District, ${customer?.pincode || '[Pincode]'}.</u></strong> (hereinafter referred to as first Party i.e consumer
      /consumer/ purchaser/owner of system).
    </p>

    <p style="text-align: center; font-weight: bold; font-size: 11px; margin: 15px 0 10px 0;">And</p>

    <p style="text-align: justify; font-size: 11px; margin: 10px 0;">
      <strong><u>Veera Vijaya Solar Systems</u></strong> (Name of Vendor) having registered office at <strong><u>[Vendor Address]</u></strong> (hereinafter referred to as second Party i.e.
      Vendor/contractor/ System Integrator).
    </p>

    <p style="text-align: center; font-weight: bold; font-size: 11px; margin: 15px 0 10px 0;">Whereas</p>

    <p style="text-align: justify; font-size: 11px; margin: 10px 0;">
      First Party wishes to install a Grid Connected Rooftop Solar Plant on the rooftop of the residential
      building of the Consumer under PM Surya Ghar: Muft Bijli Yojana.
    </p>

    <p style="text-align: center; font-weight: bold; font-size: 11px; margin: 15px 0 10px 0;">And whereas</p>

    <p style="text-align: justify; font-size: 11px; margin: 10px 0;">
      Second Party has verified availability of appropriate roof and found it feasible to install a Grid
      Connected Roof Top Solar plant and that the second party is willing to design, supply, install, test,
      commission and carry out Operation & Maintenance of the Rooftop Solar plant for 5 year period
    </p>

    <p style="text-align: justify; font-size: 11px; margin: 10px 0;">
      On this day, the First Party and Second Party agree to the following:
    </p>

    <p style="text-align: justify; font-weight: bold; text-decoration: underline; font-size: 11px; margin: 15px 0 10px 0;">
      The First Party hereby undertakes to perform the following activities:
    </p>

    <div style="margin-left: 20px;">
      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        1. Submission of online application at National Portal for installation of RTS project/system,
        Submission of application for net-metering and system inspection and upload of the
        relevant documents on the National Portal of the scheme
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        2. Provide secure storage of the material of the RTS plant delivered at the premises till
        handover of the system.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        3. Provide access to the Roof Top during installation of the plant, operation & maintenance,
        testing of the plant and equipment and for meter reading from solar meter, inverter etc.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        4. Provide electricity during plant installation and water for cleaning of the panels.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        5. Report any malfunctioning of the plant to the Vendor during the warranty period.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        6. Pay the amount as per the payment schedule as mutually agreed with the vendor, including
        any additional amount to the second party for any additional work/customization required
        depending upon the building condition
      </p>
    </div>

    <p style="text-align: justify; font-weight: bold; text-decoration: underline; font-size: 11px; margin: 15px 0 10px 0;">
      The Second Party hereby undertakes to perform the following activities:
    </p>

    <div style="margin-left: 20px;">
      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        1. The Vendor must follow all the standards and safety guidelines prescribed under state
        regulations and technical standards prescribed by MNRE for RTS projects, failing which
        the vendor is liable for blacklisting from participation in the govt. project/ scheme and
        other penal actions in accordance with the law. The responsibility of supply, installation
        and commissioning of the rooftop solar project/system in complete compliance with
        MNRE scheme guidelines lies with the Vendor.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        2. <strong>Site Survey:</strong> Site visit, survey and development of detailed project report for installation
        of RTS system. This also includes, feasibility study of roof, strength of roof and shadow
        free area. If any additional work or customization is involved for the plant installation as
        per site condition and requirement of the consumer building, the Vendor shall prepare an
        estimate and can raise separate invoice including GST in addition to the amount towards
        standard plant cost. The consumer shall pay the amount for such additional work directly
        to the Vendor.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        3. <strong>Design & Engineering:</strong> Design of plant along with drawings and selection of components
        as per standard provided by the DISCOM/SERC/MNRE for best performance and safety
        of the plant.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        4. <strong>Module and Inverter:</strong> The solar modules, including the solar cells, should be
        manufactured in India. Both the solar modules and inverters shall conform to the relevant
        standards and specifications prescribed by MNRE. Any other requirement, viz. star
        labeling (solar modules),quality control orders and standards & labeling (inverters) etc.,
        shall also be complied.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        5. <strong>Procurement & Supply:</strong> Procurement of complete system as per BIS/IS/IEC standard
        (whatever applicable) & safety guidelines for installation of rooftop solar plants. The
        supplied materials should comply with all MNRE standards for release of subsidy.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        6. <strong>Installation & Civil work:</strong> Complete civil work, structure work and electrical work
        (including drawings) following all the safety and relevant BIS standards.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        7. <strong>Documentation (Technical Catalogues/Warranty Certificates/BIS certificates/other
        test reports etc):</strong> All such documents shall be provided to the consumer for online
        uploading and submission of technical specifications, IEC/BIS report, Sr. Nos, Warranty
        card of Solar Panel & Inverter, Layout & Electrical SLD, Structure Design and Drawing,
        Cable and other detailed documents.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        8. <strong>Project completion report (PCR):</strong> Assisting the consumer in filling and uploading of
        signed documents (Consumer & Vendor) on the national portal.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        9. <strong>Warranty:</strong> System warranty certificates should be provided to the consumer. The
        complete system should be warranted for 5 years from the date of commissioning by
        DISCOM. Individual component warranty documents provided by the manufacturer shall
        be provided to the consumer and all possible assistance should be extended to the
        consumer for claiming the warranty from the manufacturer.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        10. <strong>NET meter & Grid Connectivity:</strong> Net meter supply/procurement, testing and approvals
        shall be in the scope of vendor. Grid connection of the plant shall be in the scope of the
        vendor.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        11. <strong>Testing and Commissioning:</strong> The vendor shall be present at the time of testing and
        commissioning by the DISCOM.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        12. <strong>Operation & Maintenance:</strong> Five (5) years Comprehensive Operation and Maintenance
        including overhauling, wear and tear and regular checking of healthiness of system at
        proper interval shall be in the scope of vendor. The vendor shall also educate the consumer
        on best practices for cleaning of the modules and system maintenance.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        13. <strong>Insurance:</strong> Any insurance cost pertaining to material transfer/storage before
        commissioning of the system shall be in the scope of the vendor.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        14. <strong>Applicable Standard:</strong> The system must meet the technical standards and specifications
        notified by MNRE. The vendor is solely responsible to supply component and service
        which meets the technical standards and specification prescribed by MNRE and State
        DISCOMs.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        15. <strong>Project/system cost & payment terms:</strong> The cost of the plant and payment schedule
        should be mutually discussed and decided between the vendor and consumer. The
        consumer may opt for milestone-based payment to the vendor and the same shall be
        included in the agreement.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        16. <strong>Dispute:</strong> In-case of any dispute between consumer and vendor (in
        supply/installation/maintenance of system or payment terms), both parties must settle the
        same mutually or as per law. MNRE/DISCOM shall not be liable for, and would not be a
        party to any dispute arising between vendor and consumer.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        17. <strong>Subsidy / Project Related Documents:</strong> Vendor must provide all the documents to
        consumer and help in uploading the same to National Portal for smooth release of subsidy.
      </p>

      <p style="text-align: justify; font-size: 11px; margin: 8px 0;">
        18. <strong>Performance of Plant:</strong> The Performance Ratio (PR) of Plant must be 75% at the time of
        commissioning of the project by DISCOM or its authorized agency. Vendor must provide
        (returnable basis) radiation sensor with valid calibration certificate of any NABL /
        International laboratory at the time of commissioning/ testing of the plant. Vendor must
        maintain the PR of the plant till warranty of project i.e. 5 years from the date of
        commissioning.
      </p>

      <p style="text-align: justify; font-weight: bold; font-size: 11px; margin: 15px 0 10px 0;">
        19. Mutually Agreed Terms of Payment…
      </p>
    </div>

    <table style="width: 100%; margin-top: 30px; font-size: 11px;">
      <tr>
        <td style="width: 50%; vertical-align: top; padding-right: 20px;">
          <p style="font-weight: bold; margin: 5px 0;">First Party</p>
          <p style="margin: 5px 0;"><strong>Name:</strong> ${customer?.customer_name || '[Consumer Name]'}</p>
          <p style="margin: 5px 0;"><strong>Address:</strong></p>
          <p style="margin: 5px 0;">${customer?.address || '[Address]'},</p>
          <p style="margin: 5px 0;">${customer?.district || '[District]'} District, ${customer?.pincode || '[Pincode]'}.</p>
          <br/><br/>
          <p style="margin: 5px 0;"><strong>Sign:</strong></p>
          <br/>
          <p style="margin: 5px 0;"><strong>Date:</strong></p>
        </td>
        <td style="width: 50%; vertical-align: top; padding-left: 20px;">
          <p style="font-weight: bold; margin: 5px 0;">Second Party</p>
          <p style="margin: 5px 0;"><strong>Name: Veera Vijaya Solar Systems</strong></p>
          <p style="margin: 5px 0;"><strong>Address:</strong></p>
          <p style="margin: 5px 0;">[Vendor Complete Address]</p>
          <br/><br/><br/>
          <p style="margin: 5px 0;"><strong>Sign:</strong></p>
          <br/>
          <p style="margin: 5px 0;"><strong>Date:</strong></p>
        </td>
      </tr>
    </table>

    <p style="text-align: justify; font-style: italic; font-size: 11px; margin-top: 30px;">
      <strong>Disclaimer:</strong> This agreement is between vendor and consumer and any dispute related to the same shall
      not involve any third party including MNRE and Distribution Utilities.
    </p>
  `;
};
