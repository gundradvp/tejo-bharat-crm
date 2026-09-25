export interface SolarCustomerData {
  customer_name: string;
  consumer_no: string;
  address: string;
  application_ref: string;
  capacity: string;
  project_capacity_kw: number;
  total_watts: number;
  panel_number: number;
  panel_make: string;
  panel_serial_numbers: string;
  eb_distribution: string;
  eb_section: string;
  latitude: string;
  longitude: string;
  mobile_number: string;
  inverter_make: string;
  inverter_serial_number: string;
  inverter_capacity: string;
  module_make: string;
  module_type: string;
  module_capacity: string;
  number_of_modules: string;
  plant_capacity: string;
  plant_capacity_in_kw: number;
  aadhar_number: string;
  email?: string;
  bill_number?: string;
  category?: string;
  sanctioned_load?: string;
  dcr_certificate_number?: string;
  feasibility_date?: string;
}

async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      text += pageText + '\n';
    }

    return text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

function extractMatch(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1]?.trim() || match[0]?.trim() || '';
    }
  }
  return '';
}

function extractAllMatches(text: string, pattern: RegExp): string[] {
  const matches = [];
  let match;
  const regex = new RegExp(pattern.source, pattern.flags);
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[0]);
  }
  return matches;
}

export async function extractDCRData(file: File): Promise<Partial<SolarCustomerData>> {
  const text = await extractTextFromPdf(file);

  const nameMatch = text.match(/To\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),/i) ||
                    text.match(/Name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
  const customerName = nameMatch ? nameMatch[1].trim() : '';

  const addressMatch = text.match(/D\.No\.\s*([^,]+,[^,]+,[^,]+)/i) ||
                       text.match(/Address[:\s]+([^\n]+)/i);
  const address = addressMatch ? addressMatch[1].trim() : '';

  const appRefMatch = text.match(/Application\s+(?:Number|Ref|Reference)\s*[#:\s]*([A-Z]{2}-[A-Z]+\d+-\d+)/i);
  const applicationRef = appRefMatch ? appRefMatch[1].trim() : '';

  const dcrCertMatch = text.match(/DCR\s+Certificate\s+Number\s*:\s*([0-9-]+)/i);
  const dcrCertificateNumber = dcrCertMatch ? dcrCertMatch[1].trim() : '';

  const kwMatch = text.match(/(\d+\.?\d*)\s*(?:KW|kW|Kilowatt)/i);
  const capacityKw = kwMatch ? parseFloat(kwMatch[1]) : 0;

  const panelMakeMatch = text.match(/(?:Solar\s+(?:Cell|Module)\s+Manufactured\s+By|Module\s+Make)[:\s]+([A-Za-z\s]+(?:Limited|Ltd|Private))/i);
  const panelMake = panelMakeMatch ? panelMakeMatch[1].trim() : '';

  const panelSerialPattern = /[A-Z]{2}\d{7,10}[A-Z]?\d{4}/g;
  const panelSerials = extractAllMatches(text, panelSerialPattern);
  const panelSerialNumbers = panelSerials.join(', ');

  const moduleCapacityMatch = text.match(/(\d+)\s*Wp/i);
  const moduleCapacity = moduleCapacityMatch ? moduleCapacityMatch[1] : '';

  const quantityMatch = text.match(/Quantity[:\s]+(\d+)/i);
  const numberOfModules = quantityMatch ? quantityMatch[1] : panelSerials.length.toString();

  const totalWatts = moduleCapacity && numberOfModules ?
    parseInt(moduleCapacity) * parseInt(numberOfModules) : capacityKw * 1000;

  return {
    customer_name: customerName,
    address,
    application_ref: applicationRef,
    dcr_certificate_number: dcrCertificateNumber,
    capacity: `${capacityKw} KWp`,
    project_capacity_kw: capacityKw,
    total_watts: totalWatts,
    panel_number: panelSerials.length || parseInt(numberOfModules),
    panel_make: panelMake,
    panel_serial_numbers: panelSerialNumbers,
    module_make: panelMake,
    module_capacity: moduleCapacity,
    number_of_modules: numberOfModules,
    plant_capacity: totalWatts.toString(),
    plant_capacity_in_kw: capacityKw,
  };
}

export async function extractFeasibilityData(file: File): Promise<Partial<SolarCustomerData>> {
  const text = await extractTextFromPdf(file);

  const nameMatch = text.match(/Name\s+of\s+Applicant[:\s]+([A-Z\s]+)/i) ||
                    text.match(/(?:Sh\/Smt|Mr\.|Ms\.)\s+([A-Z][A-Z\s]+?)(?:\s+Date:|\n)/i);
  const customerName = nameMatch ? nameMatch[1].trim() : '';

  const mobileMatch = text.match(/Mobile\s+No\.?[:\s]+(\d{10})/i);
  const mobileNumber = mobileMatch ? mobileMatch[1] : '';

  const emailMatch = text.match(/Email\s+ID[:\s]+([^\s\n]+@[^\s\n]+)/i);
  const email = emailMatch ? emailMatch[1].trim() : '';

  const consumerMatch = text.match(/Consumer\s+Account\s+Number[:\s]+(\d+)/i);
  const consumerNo = consumerMatch ? consumerMatch[1] : '';

  const appRefMatch = text.match(/Application\s+Reference\s+Number[:\s]*([A-Z]{2}-[A-Z]+\d+-\d+)/i);
  const applicationRef = appRefMatch ? appRefMatch[1] : '';

  const addressMatch = text.match(/Address\s+of\s+Premises[:\s]+([^\n]+(?:\n[^\n]+)*?)(?=\n\s*\d+\.|District:|$)/is);
  let address = '';
  if (addressMatch) {
    address = addressMatch[1]
      .replace(/\s+/g, ' ')
      .replace(/District:[^,]*/i, '')
      .replace(/State:[^,]*/i, '')
      .replace(/PIN\s+Code:[^,]*/i, '')
      .trim();
  }

  const categoryMatch = text.match(/Category\s+of\s+Consumer[:\s]+([A-Za-z]+)/i);
  const category = categoryMatch ? categoryMatch[1] : '';

  const sanctionedLoadMatch = text.match(/(?:Contract\s+Demand|Sanctioned\s+Load)[:\s]+([\d.]+)\s*kW/i);
  const sanctionedLoad = sanctionedLoadMatch ? sanctionedLoadMatch[1] + ' kW' : '';

  const capacityMatch = text.match(/(?:Applied|Approved).*?(?:Solar|Plant)\s+(?:Plant\s+)?Capacity[:\s]+([\d.]+)\s*kWp/i);
  const capacityKw = capacityMatch ? parseFloat(capacityMatch[1]) : 0;

  const dateMatch = text.match(/Approved\s+on[:\s]+(\d{2}-\d{2}-\d{4})/i) ||
                    text.match(/Date[:\s]+(\d{2}-\d{2}-\d{4})/i);
  const feasibilityDate = dateMatch ? dateMatch[1] : '';

  return {
    customer_name: customerName,
    mobile_number: mobileNumber,
    email,
    consumer_no: consumerNo,
    application_ref: applicationRef,
    address,
    category,
    sanctioned_load: sanctionedLoad,
    capacity: `${capacityKw} KWp`,
    project_capacity_kw: capacityKw,
    plant_capacity_in_kw: capacityKw,
    feasibility_date: feasibilityDate,
  };
}

export async function extractPowerBillData(file: File): Promise<Partial<SolarCustomerData>> {
  let text = '';

  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    text = await extractTextFromPdf(file);
  } else if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    const imageText = await new Promise<string>((resolve) => {
      reader.onload = () => {
        resolve(file.name);
      };
      reader.readAsDataURL(file);
    });
    text = imageText;
  }

  const nameMatch = text.match(/([A-Z][A-Z\s]+?),\s*\d/i) ||
                    text.match(/Consumer\s+Name[:\s]+([A-Z\s]+)/i);
  const customerName = nameMatch ? nameMatch[1].trim() : '';

  const consumerMatch = text.match(/(?:Service\s+Number|Consumer\s+(?:Account\s+)?Number)[:\s]+(\d{10,})/i);
  const consumerNo = consumerMatch ? consumerMatch[1] : '';

  const billMatch = text.match(/Bill\s+Number[:\s]+(\d+)/i);
  const billNumber = billMatch ? billMatch[1] : '';

  const addressLines = text.match(/([^\n]*\d+-\d+[^\n]*(?:\n[^\n]*){0,3})/i);
  const address = addressLines ? addressLines[0].replace(/\s+/g, ' ').trim() : '';

  const mobileMatch = text.match(/(?:Mobile|Phone|Contact)[:\s]*(\d{10})/i);
  const mobileNumber = mobileMatch ? mobileMatch[1] : '';

  const sanctionedLoadMatch = text.match(/(?:Sanctioned\s+Load|Contract\s+Demand|Connected\s+Load)[:\s]+([\d.]+)/i);
  const sanctionedLoad = sanctionedLoadMatch ? sanctionedLoadMatch[1] + ' kW' : '';

  const categoryMatch = text.match(/Category[:\s]+([^\n]+)/i);
  const category = categoryMatch ? categoryMatch[1].trim() : '';

  return {
    customer_name: customerName,
    consumer_no: consumerNo,
    bill_number: billNumber,
    address,
    mobile_number: mobileNumber,
    sanctioned_load: sanctionedLoad,
    category,
  };
}

export async function mergeDocumentData(
  dcrData?: Partial<SolarCustomerData>,
  feasibilityData?: Partial<SolarCustomerData>,
  powerBillData?: Partial<SolarCustomerData>
): Promise<SolarCustomerData> {
  const merged: any = {
    customer_name: '',
    consumer_no: '',
    address: '',
    application_ref: '',
    capacity: '0 KWp',
    project_capacity_kw: 0,
    total_watts: 0,
    panel_number: 0,
    panel_make: '',
    panel_serial_numbers: '',
    eb_distribution: '',
    eb_section: '',
    latitude: '',
    longitude: '',
    mobile_number: '',
    inverter_make: '',
    inverter_serial_number: '',
    inverter_capacity: '',
    module_make: '',
    module_type: '',
    module_capacity: '',
    number_of_modules: '',
    plant_capacity: '',
    plant_capacity_in_kw: 0,
    aadhar_number: '',
  };

  if (dcrData) Object.assign(merged, dcrData);
  if (feasibilityData) {
    Object.keys(feasibilityData).forEach(key => {
      if (feasibilityData[key as keyof SolarCustomerData] && !merged[key]) {
        merged[key] = feasibilityData[key as keyof SolarCustomerData];
      }
    });
  }
  if (powerBillData) {
    Object.keys(powerBillData).forEach(key => {
      if (powerBillData[key as keyof SolarCustomerData] && !merged[key]) {
        merged[key] = powerBillData[key as keyof SolarCustomerData];
      }
    });
  }

  if (merged.address) {
    const addressMatch = merged.address.match(/([^,]+),\s*([^,]+)/);
    if (addressMatch) {
      merged.eb_distribution = addressMatch[2].trim();
      merged.eb_section = addressMatch[2].trim();
    }
  }

  return merged as SolarCustomerData;
}
