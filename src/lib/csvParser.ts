export interface CSVCustomerData {
  applicationNumber: string;
  consumerRegistrationNumber: string;
  consumerName: string;
  mobileNo: string;
  email: string;
  address: string;
  districtName: string;
  stateName: string;
  applicationStatus: string;
  loanStatus: string;
  loanSanctionedDate?: string;
  loanDisbursedDate?: string;
  loanDisbursedAmount?: string;
  feasibilityApprovedDate?: string;
  installationDate?: string;
  installedCapacity?: string;
  inspectionStatus?: string;
  inspectionDate?: string;
  subsidyAmount?: string;
  subsidyVerifiedDate?: string;
  subsidyDisbursedDate?: string;
}

export function parseCustomerCSV(csvContent: string): CSVCustomerData[] {
  const lines = csvContent.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV file is empty or invalid');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const customers: CSVCustomerData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length < headers.length) continue;

    const customer: CSVCustomerData = {
      applicationNumber: cleanValue(values[3]),
      consumerRegistrationNumber: cleanValue(values[1]),
      consumerName: cleanValue(values[6]),
      mobileNo: cleanValue(values[7]),
      email: cleanValue(values[8]),
      address: cleanValue(values[9]),
      districtName: cleanValue(values[10]),
      stateName: cleanValue(values[11]),
      applicationStatus: cleanValue(values[5]),
      loanStatus: cleanValue(values[30]) || 'not_applicable',
      loanSanctionedDate: cleanValue(values[31]),
      loanDisbursedDate: cleanValue(values[33]),
      loanDisbursedAmount: cleanValue(values[34]),
      feasibilityApprovedDate: cleanValue(values[40]),
      installationDate: cleanValue(values[43]),
      installedCapacity: cleanValue(values[44]),
      inspectionStatus: cleanValue(values[49]),
      inspectionDate: cleanValue(values[50]),
      subsidyAmount: cleanValue(values[54]),
      subsidyVerifiedDate: cleanValue(values[57]),
      subsidyDisbursedDate: cleanValue(values[58]),
    };

    if (customer.applicationNumber && customer.consumerName) {
      customers.push(customer);
    }
  }

  return customers;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function cleanValue(value: string): string {
  return value.replace(/"/g, '').trim();
}

export function mapLoanStatus(status: string): 'pending' | 'approved' | 'rejected' | 'not_applicable' {
  const normalized = status.toLowerCase();
  if (normalized.includes('sanctioned') || normalized.includes('approved')) return 'approved';
  if (normalized.includes('rejected')) return 'rejected';
  if (normalized.includes('pending')) return 'pending';
  return 'not_applicable';
}

export function mapDocumentStatus(inspectionStatus: string): 'not_submitted' | 'partial' | 'complete' | 'verified' {
  const normalized = inspectionStatus.toLowerCase();
  if (normalized.includes('approved') || normalized.includes('verified')) return 'verified';
  if (normalized.includes('complete')) return 'complete';
  if (normalized.includes('partial')) return 'partial';
  return 'not_submitted';
}

export function mapInstallationStatus(installationDate: string, inspectionStatus: string): 'not_started' | 'scheduled' | 'in_progress' | 'completed' {
  if (inspectionStatus && inspectionStatus.toLowerCase().includes('approved')) return 'completed';
  if (installationDate) return 'in_progress';
  return 'not_started';
}

export function mapSubsidyStatus(subsidyAmount: string, subsidyDisbursedDate: string, subsidyVerifiedDate: string): 'not_claimed' | 'claimed' | 'received' | 'rejected' {
  if (subsidyDisbursedDate) return 'received';
  if (subsidyVerifiedDate) return 'claimed';
  if (subsidyAmount && parseFloat(subsidyAmount) > 0) return 'claimed';
  return 'not_claimed';
}
