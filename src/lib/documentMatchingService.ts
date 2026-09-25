import { supabase } from './supabase';
import { ExtractedData } from './documentExtractor';

export interface MatchResult {
  customerId: string;
  customerName: string;
  phone: string;
  confidence: number;
  matchedFields: string[];
  sourceFields: Partial<ExtractedData>;
}

interface CustomerCandidate {
  id: string;
  customer_name: string;
  phone: string;
  consumer_number?: string;
  electricity_bill_number?: string;
  loan_reference_number?: string;
  aadhar_number?: string;
  pan_number?: string;
}

function calculatePhoneMatch(extractedPhone?: string, customerPhone?: string): { score: number; matched: boolean } {
  if (!extractedPhone || !customerPhone) return { score: 0, matched: false };

  const sanitizePhone = (phone: string) => phone.replace(/\D/g, '').slice(-10);
  const extractedSanitized = sanitizePhone(extractedPhone);
  const customerSanitized = sanitizePhone(customerPhone);

  if (extractedSanitized === customerSanitized) {
    return { score: 100, matched: true };
  }

  const similarity = calculateStringSimilarity(extractedSanitized, customerSanitized);
  return { score: similarity * 90, matched: similarity > 0.8 };
}

function calculateNameMatch(extractedName?: string, customerName?: string): { score: number; matched: boolean } {
  if (!extractedName || !customerName) return { score: 0, matched: false };

  const normalize = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ');
  const extractedNorm = normalize(extractedName);
  const customerNorm = normalize(customerName);

  if (extractedNorm === customerNorm) {
    return { score: 100, matched: true };
  }

  const similarity = calculateStringSimilarity(extractedNorm, customerNorm);
  return { score: similarity * 70, matched: similarity > 0.7 };
}

function calculateExactMatch(extractedValue?: string, customerValue?: string): { score: number; matched: boolean } {
  if (!extractedValue || !customerValue) return { score: 0, matched: false };

  const sanitize = (val: string) => val.toUpperCase().trim().replace(/\s/g, '');
  const extractedSanitized = sanitize(extractedValue);
  const customerSanitized = sanitize(customerValue);

  if (extractedSanitized === customerSanitized) {
    return { score: 100, matched: true };
  }

  return { score: 0, matched: false };
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = getLevenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getLevenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

export async function matchDocumentToCustomer(extractedData: ExtractedData): Promise<MatchResult | null> {
  try {
    const { data: customers, error: fetchError } = await supabase
      .from('customers')
      .select('id, customer_name, phone, consumer_number, electricity_bill_number, loan_reference_number, aadhar_number, pan_number')
      .limit(1000);

    if (fetchError) throw fetchError;
    if (!customers || customers.length === 0) return null;

    let bestMatch: MatchResult | null = null;
    let bestScore = 0;
    const matchedFields: string[] = [];

    for (const customer of customers as CustomerCandidate[]) {
      let score = 0;
      const fields: string[] = [];

      const phoneMatch = calculatePhoneMatch(extractedData.phoneNumber, customer.phone);
      if (phoneMatch.matched) {
        score += 40;
        fields.push('phone');
      }

      const consumerMatch = calculateExactMatch(extractedData.consumerNumber, customer.consumer_number);
      if (consumerMatch.matched) {
        score += 25;
        fields.push('consumer_number');
      }

      const billMatch = calculateExactMatch(extractedData.electricityBillNumber, customer.electricity_bill_number);
      if (billMatch.matched) {
        score += 25;
        fields.push('electricity_bill_number');
      }

      const loanRefMatch = calculateExactMatch(extractedData.loanReferenceNumber, customer.loan_reference_number);
      if (loanRefMatch.matched) {
        score += 20;
        fields.push('loan_reference_number');
      }

      const aadharMatch = calculateExactMatch(extractedData.aadharNumber, customer.aadhar_number);
      if (aadharMatch.matched) {
        score += 20;
        fields.push('aadhar_number');
      }

      const panMatch = calculateExactMatch(extractedData.panNumber, customer.pan_number);
      if (panMatch.matched) {
        score += 15;
        fields.push('pan_number');
      }

      const nameMatch = calculateNameMatch(extractedData.customerName, customer.customer_name);
      score += nameMatch.score * 0.15;
      if (nameMatch.matched) {
        fields.push('customer_name');
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          customerId: customer.id,
          customerName: customer.customer_name,
          phone: customer.phone,
          confidence: Math.min(bestScore, 100),
          matchedFields: fields,
          sourceFields: extractedData,
        };
      }
    }

    if (bestScore >= 25) {
      return bestMatch;
    }

    return null;
  } catch (error) {
    console.error('Error matching document to customer:', error);
    return null;
  }
}

export async function findAllMatches(extractedData: ExtractedData): Promise<MatchResult[]> {
  try {
    const { data: customers, error: fetchError } = await supabase
      .from('customers')
      .select('id, customer_name, phone, consumer_number, electricity_bill_number, loan_reference_number, aadhar_number, pan_number')
      .limit(1000);

    if (fetchError) throw fetchError;
    if (!customers || customers.length === 0) return [];

    const matches: MatchResult[] = [];

    for (const customer of customers as CustomerCandidate[]) {
      let score = 0;
      const fields: string[] = [];

      const phoneMatch = calculatePhoneMatch(extractedData.phoneNumber, customer.phone);
      if (phoneMatch.matched) {
        score += 40;
        fields.push('phone');
      }

      const consumerMatch = calculateExactMatch(extractedData.consumerNumber, customer.consumer_number);
      if (consumerMatch.matched) {
        score += 25;
        fields.push('consumer_number');
      }

      const billMatch = calculateExactMatch(extractedData.electricityBillNumber, customer.electricity_bill_number);
      if (billMatch.matched) {
        score += 25;
        fields.push('electricity_bill_number');
      }

      const loanRefMatch = calculateExactMatch(extractedData.loanReferenceNumber, customer.loan_reference_number);
      if (loanRefMatch.matched) {
        score += 20;
        fields.push('loan_reference_number');
      }

      const aadharMatch = calculateExactMatch(extractedData.aadharNumber, customer.aadhar_number);
      if (aadharMatch.matched) {
        score += 20;
        fields.push('aadhar_number');
      }

      const panMatch = calculateExactMatch(extractedData.panNumber, customer.pan_number);
      if (panMatch.matched) {
        score += 15;
        fields.push('pan_number');
      }

      const nameMatch = calculateNameMatch(extractedData.customerName, customer.customer_name);
      score += nameMatch.score * 0.15;
      if (nameMatch.matched) {
        fields.push('customer_name');
      }

      if (score >= 25) {
        matches.push({
          customerId: customer.id,
          customerName: customer.customer_name,
          phone: customer.phone,
          confidence: Math.min(score, 100),
          matchedFields: fields,
          sourceFields: extractedData,
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  } catch (error) {
    console.error('Error finding document matches:', error);
    return [];
  }
}
