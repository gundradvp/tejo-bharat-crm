export interface ExtractedData {
  fullText: string;
  customerName?: string;
  phoneNumber?: string;
  applicationNumber?: string;
  loanReferenceNumber?: string;
  consumerNumber?: string;
  aadharNumber?: string;
  panNumber?: string;
  electricityBillNumber?: string;
  bankName?: string;
  loanAmount?: number;
}

const PATTERNS = {
  phoneNumber: /(?:\+91[-.\s]?)?(?:[6-9]\d{3}[-.\s]?\d{4}[-.\s]?\d{4}|\d{10})/g,
  aadharNumber: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  panNumber: /[A-Z]{5}[0-9]{4}[A-Z]{1}/g,
  applicationNumber: /(?:ANS|APP|APP-|APPLICATION|APPNO|APP[\s-]?NO)[\s-]?([A-Z0-9\-]+)/gi,
  loanReferenceNumber: /(?:LOAN|REF|REFERENCE|REF[\s-]?NO|LOAN[\s-]?REF)[\s-]?([A-Z0-9\-]+)/gi,
  consumerNumber: /(?:CONSUMER|CONSUMER[\s-]?NO|CONS[\s-]?NO|CONSUMER[\s-]?NUMBER)[\s-]?([A-Z0-9\-]+)/gi,
  electricityBillNumber: /(?:EB[\s-]?NO|BILL[\s-]?NO|ELECTRICITY[\s-]?BILL)[\s-]?([A-Z0-9\-]+)/gi,
  loanAmount: /(?:Rs\.?|₹|Amount|AMOUNT)[\s]+([\d,]+(?:\.\d{2})?)/gi,
  bankName: /(?:Bank|BANK)[\s]+([A-Za-z\s]+)(?:Bank|BANK)?/gi,
};

function extractMatches(text: string, pattern: RegExp): string[] {
  const matches = text.match(pattern) || [];
  return [...new Set(matches)];
}

function extractGroupMatches(text: string, pattern: RegExp, groupIndex: number = 1): string[] {
  const matches = [];
  let match;
  const regex = new RegExp(pattern.source, pattern.flags);
  while ((match = regex.exec(text)) !== null) {
    if (match[groupIndex]) {
      matches.push(match[groupIndex].trim());
    }
  }
  return [...new Set(matches)];
}

function findCustomerName(text: string): string | undefined {
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 5 && trimmed.length < 100 && /^[A-Za-z\s]+$/.test(trimmed)) {
      const words = trimmed.split(/\s+/).filter(w => w.length > 2);
      if (words.length >= 1 && words.length <= 4) {
        return trimmed;
      }
    }
  }
  return undefined;
}

function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
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

async function extractTextFromImage(file: File): Promise<string> {
  try {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const text = performSimpleOcr(imageData);
            resolve(text);
          } else {
            reject(new Error('Could not get canvas context'));
          }
        };
        img.onerror = () => reject(new Error('Could not load image'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.readAsDataURL(file);
    });
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error('Failed to extract text from image');
  }
}

function performSimpleOcr(imageData: ImageData): string {
  const pixels = imageData.data;
  const text = [];

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const brightness = (r + g + b) / 3;

    if (brightness < 128) {
      text.push('█');
    } else {
      text.push(' ');
    }

    if ((i / 4) % imageData.width === 0) {
      text.push('\n');
    }
  }

  return text.join('');
}

export async function extractDocumentData(file: File): Promise<ExtractedData> {
  let fullText = '';

  try {
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      fullText = await extractTextFromPdf(file);
    } else if (file.type.startsWith('image/')) {
      fullText = await extractTextFromImage(file);
    } else if (file.type.includes('word') || file.type.includes('document')) {
      const text = await file.text();
      fullText = text;
    } else if (file.type.includes('spreadsheet')) {
      const text = await file.text();
      fullText = text;
    } else {
      const text = await file.text();
      fullText = text;
    }
  } catch (error) {
    console.error('Error extracting file content:', error);
    fullText = file.name;
  }

  const upperText = fullText.toUpperCase();

  const phoneNumbers = extractMatches(upperText, PATTERNS.phoneNumber);
  const sanitizedPhones = phoneNumbers.map(sanitizePhoneNumber);
  const phoneNumber = sanitizedPhones[0];

  const applicationNumbers = extractGroupMatches(upperText, PATTERNS.applicationNumber);
  const applicationNumber = applicationNumbers[0];

  const loanReferenceNumbers = extractGroupMatches(upperText, PATTERNS.loanReferenceNumber);
  const loanReferenceNumber = loanReferenceNumbers[0];

  const consumerNumbers = extractGroupMatches(upperText, PATTERNS.consumerNumber);
  const consumerNumber = consumerNumbers[0];

  const aadharNumbers = extractMatches(fullText, PATTERNS.aadharNumber);
  const aadharNumber = aadharNumbers[0];

  const panNumbers = extractMatches(fullText, PATTERNS.panNumber);
  const panNumber = panNumbers[0];

  const electricityBillNumbers = extractGroupMatches(upperText, PATTERNS.electricityBillNumber);
  const electricityBillNumber = electricityBillNumbers[0];

  const loanAmounts = extractGroupMatches(fullText, PATTERNS.loanAmount, 1);
  const loanAmount = loanAmounts[0]
    ? parseFloat(loanAmounts[0].replace(/,/g, ''))
    : undefined;

  const bankNames = extractGroupMatches(fullText, PATTERNS.bankName, 1);
  const bankName = bankNames[0];

  const customerName = findCustomerName(fullText);

  return {
    fullText,
    customerName,
    phoneNumber,
    applicationNumber,
    loanReferenceNumber,
    consumerNumber,
    aadharNumber,
    panNumber,
    electricityBillNumber,
    loanAmount,
    bankName,
  };
}
