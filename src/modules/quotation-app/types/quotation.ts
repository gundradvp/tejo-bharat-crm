export interface Branch {
  id: string;
  code: string;
  name: string;
  company_name?: string;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  phone: string;
  email: string;
  gstin: string;
  cin?: string;
  pan?: string;
  website?: string;
  signatory_title?: string;
  is_default?: boolean;
}

export interface ComponentItem {
  no: number;
  name: string;
  specification: string;
  brand: string;
  qty: string;
  included: boolean;
}

export type DocumentType = 'Quotation' | 'Proforma Invoice' | 'Tax Invoice' | 'Sales Invoice' | 'Payment In' | 'Delivery Challan' | 'Credit Note';

export interface BankDetails {
  account_name: string;
  bank_name: string;
  account_no: string;
  ifsc_code: string;
  branch_name: string;
  upi_id: string;
}

export const DEFAULT_BANK_DETAILS: BankDetails = {
  account_name: 'TEJO BHARAT GLOBAL ENERGY LLP',
  bank_name: 'Kotak Mahindra Bank',
  account_no: '9989279586',
  ifsc_code: 'KKBK0000574',
  branch_name: 'Sarpavaram',
  upi_id: '9989279586@kotak',
};

export interface LineItem {
  id: string;
  name: string;
  description?: string;
  hsn_code?: string;
  qty: number;
  unit?: string;
  price_per_item: number; // Tax-exclusive base price
  update_sales_price?: boolean;
  discount_rs?: number;
  discount_percent?: number;
  tax_rate_percent: number;
  tax_amount: number;
  total_amount: number;
}

export interface SettledInvoice {
  invoice_no: string;
  quotation_id?: string;
  date: string;
  invoice_amount: number;
  tds?: number;
  discount?: number;
  amount_settled: number;
  balance_amount: number;
}

export interface PaymentInRecord {
  id: string;
  payment_number: string;
  party_name: string;
  party_id?: string;
  payment_date: string;
  payment_mode: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Netbanking';
  amount_received: number;
  discount?: number;
  notes?: string;
  settled_invoices: SettledInvoice[];
  created_at?: string;
}

export interface Quotation {
  id?: string;
  document_type?: DocumentType;
  invoice_prefix?: string;
  quotation_no: string;
  quotation_date: string;
  valid_until: string;
  due_date?: string;
  po_number?: string;
  eway_bill_no?: string;
  repeat_invoice?: boolean;
  line_items?: LineItem[];
  
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_billing_address?: string;
  customer_shipping_address?: string;
  same_as_billing?: boolean;
  customer_location: string;
  customer_gstin?: string;
  customer_pan?: string;
  category: 'Residential / Home' | 'Group Housing Society (GHS)' | 'Commercial / Institutional' | 'Industrial' | string;
  installation_type: string;
  
  // Specs
  system_capacity_kw: number;
  pricing_mode: 'per_kw' | 'total_cost';
  rate_per_kw: number;
  total_amount: number;
  
  // Calculated Specs
  monthly_units: number;
  annual_units: number;
  system_life_years: number;
  monthly_savings_rs: number;
  payback_period_years: number;
  
  // Brands & Technical BOM Specs
  panel_brand: string;
  inverter_brand: string;
  inverter_phase?: string;
  cables_brand: string;
  structure_type: string;
  structure_grid?: string;
  structure_height?: string;
  
  // Branch & Tax & Bank Details
  branch_id: string;
  branch?: Branch;
  hsn_code?: string;
  gst_rate_percent?: number;
  payment_status?: 'Unpaid' | 'Partial' | 'Paid';
  bank_details?: BankDetails;
  
  // MyBillBook Financial fields
  notes?: string;
  terms_and_conditions?: string;
  additional_charges?: number;
  additional_charges_label?: string;
  tcs_applied?: boolean;
  tcs_rate?: number;
  auto_round_off?: boolean;
  amount_received?: number;
  payment_type?: 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque';
  is_fully_paid?: boolean;
  quote_format?: '2_page' | '5_page';
  show_gst_in_table?: boolean;
  gst_display_mode?: 'detailed' | 'compact';
  is_interstate?: boolean;
  
  // Scope of Work items
  scope_items?: ScopeItem[];
  
  // Proposal Sections Order & Page Layout
  proposal_sections?: ProposalSection[];
  
  // Status
  status: 'Draft' | 'Active' | 'Approved' | 'Rejected' | 'Expired';
  created_at?: string;
}

export interface ProposalSection {
  id: string;
  title: string;
  defaultPage: number;
  page: number; // 1..5
  visible: boolean;
  customTitle?: string;
  customSubtitle?: string;
  customText?: string;
  customBullets?: string[];
  customNote?: string;
}

export const INITIAL_PROPOSAL_SECTIONS: ProposalSection[] = [
  // Page 1
  { id: 'header_exec', title: 'Customer & Executive Highlights', defaultPage: 1, page: 1, visible: true },
  { id: 'seasonal_profile', title: 'Seasonal Generation Profile', defaultPage: 1, page: 1, visible: true },
  { id: 'env_impact', title: '25-Yr Environmental Impact', defaultPage: 1, page: 1, visible: true },
  { id: 'why_choose_us', title: 'Why Choose Tejo Bharat', defaultPage: 1, page: 1, visible: true },

  // Page 2
  { id: 'bom_breakdown', title: 'Bill of Materials (BOM)', defaultPage: 2, page: 2, visible: true },
  { id: 'electrical_diagram', title: 'Electrical SLD & Power Flow', defaultPage: 2, page: 2, visible: true },
  { id: 'standards_certs', title: 'Compliance & BIS Standards', defaultPage: 2, page: 2, visible: true },
  { id: 'hardware_safety', title: 'Hardware Quality & Safety', defaultPage: 2, page: 2, visible: true },

  // Page 3
  { id: 'commercial_items', title: 'Commercial Line Items Table', defaultPage: 3, page: 3, visible: true },
  { id: 'cost_breakdown', title: 'Project Cost & Subsidy Breakdown', defaultPage: 3, page: 3, visible: true },
  { id: 'tax_incentives', title: 'Tax & Policy Incentives', defaultPage: 3, page: 3, visible: true },
  { id: 'financial_forecast', title: '25-Year Financial Forecast', defaultPage: 3, page: 3, visible: true },
  { id: 'cost_comparison', title: 'Monthly Cost Comparison', defaultPage: 3, page: 3, visible: true },
  { id: 'bank_details', title: 'Bank Payment Details', defaultPage: 3, page: 3, visible: true },

  // Page 4
  { id: 'scope_matrix', title: 'Scope of Work Responsibilities', defaultPage: 4, page: 4, visible: true },
  { id: 'execution_timeline', title: 'Project Execution Timeline', defaultPage: 4, page: 4, visible: true },
  { id: 'warranty_matrix', title: 'Comprehensive Warranty Matrix', defaultPage: 4, page: 4, visible: true },
  { id: 'telemetry_sop', title: 'Remote Monitoring & Maintenance SOP', defaultPage: 4, page: 4, visible: true },
  { id: 'policy_summary', title: 'Government Policy & Net Metering', defaultPage: 4, page: 4, visible: true },

  // Page 5
  { id: 'payment_milestones', title: 'Commercial Payment Milestones', defaultPage: 5, page: 5, visible: true },
  { id: 'terms_conditions', title: 'Terms & Conditions of Supply', defaultPage: 5, page: 5, visible: true },
  { id: 'thank_you_signatures', title: 'Order Acceptance & Signatures', defaultPage: 5, page: 5, visible: true },
];

export const PAGE_TITLES: Record<number, { title: string; subtitle: string; icon: string }> = {
  1: { title: 'Page 1', subtitle: 'Customer Info & Solar Highlights', icon: '👤' },
  2: { title: 'Page 2', subtitle: 'Technical BOM & SLD Diagram', icon: '⚡' },
  3: { title: 'Page 3', subtitle: 'Commercials & Financials', icon: '💰' },
  4: { title: 'Page 4', subtitle: 'Scope, Timeline & SOPs', icon: '🛠️' },
  5: { title: 'Page 5', subtitle: 'Milestones & Signatures', icon: '✍️' },
};

export interface SectionContentConfig {
  title: string;
  subtitle?: string;
  text?: string;
  bullets?: string[];
  note?: string;
}

export const DEFAULT_SECTION_CONTENT: Record<string, SectionContentConfig> = {
  header_exec: {
    title: 'Customer & Executive Highlights',
    subtitle: 'TECHNICAL & COMMERCIAL PROPOSAL',
    text: 'Customized high-efficiency rooftop solar energy solution engineered for maximum solar yield, 25-year performance warranty, and zero-electricity bill operation.',
    note: ''
  },
  seasonal_profile: {
    title: 'Seasonal Generation Profile',
    subtitle: 'Estimated Seasonal Energy Generation Profile',
    text: 'Estimated units generation per month across Summer, Monsoon, and Winter based on regional solar insolation index.',
    note: ''
  },
  env_impact: {
    title: '25-Yr Environmental Impact',
    subtitle: '25-Year Lifetime Environmental Impact',
    text: 'Green energy contribution offsetting carbon dioxide emissions and equivalent to planting thousands of trees over the 25-year lifespan of the solar system.',
    note: ''
  },
  why_choose_us: {
    title: 'Why Choose Tejo Bharat',
    subtitle: 'Why Choose Tejo Bharat Global Energy LLP?',
    text: 'Accelerating a Sustainable Future with proven engineering excellence and customer-first service.',
    bullets: [
      'Tier-1 ALMM Hardware: MNRE-approved Mono DCR / TopCon modules & Tier-1 smart string inverters.',
      'Turnkey Net Metering: Complete DISCOM application, CEIG approvals, and bi-directional meter synchronization.',
      '25-Year Performance: Guaranteed 25-year panel linear output warranty & dedicated local service team.'
    ],
    note: ''
  },
  bom_breakdown: {
    title: 'Bill of Materials (BOM)',
    subtitle: 'System Components & Bill of Materials (BOM)',
    text: 'All equipment supplied conforms to MNRE guidelines and BIS certifications.',
    note: 'Wiring up to 50 meters from panels to inverter and inverter to main AC panel included.'
  },
  electrical_diagram: {
    title: 'Electrical SLD & Power Flow',
    subtitle: 'Electrical Single Line Diagram (SLD) & Power Flow Architecture',
    text: 'Seamless bi-directional grid export power flow with multi-tier surge and earth protection.',
    bullets: [
      'Solar PV Array (DC Generation) → DCDB with Type-II Surge Protection Device (SPD)',
      'High-Efficiency String Inverter (DC to AC Conversion) with MPPT & Wi-Fi Telemetry',
      'ACDB with MCB/MCCB Isolation & Overload Protection → Bi-Directional Net Meter'
    ],
    note: 'Safe dual chemical earthing for AC/DC and separate dedicated earthing pit for lightning arrester.'
  },
  standards_certs: {
    title: 'Compliance & BIS Standards',
    subtitle: 'Compliance, Safety & BIS Standard Certifications',
    text: 'Hardware and installation comply strictly with Central Electricity Authority (CEA) regulations.',
    bullets: [
      'IS/IEC 61215 & IS/IEC 61730: Design qualification, mechanical load, and safety qualification for crystalline PV modules.',
      'IS 16221 / IEC 62109-1 & 2: Safety of power converters & inverters used in photovoltaic power systems.',
      'IS 3043: Code of practice for electrical earthing and grounding of solar structures and equipment.',
      'IEC 60068-2-68 / IEC 61701: Salt mist corrosion resistance and dust endurance certification.'
    ],
    note: ''
  },
  hardware_safety: {
    title: 'Hardware Quality & Safety',
    subtitle: 'Hardware Quality & Safety Protections',
    text: 'Multi-layer safety protections engineered for maximum uptime and zero hazard operation.',
    bullets: [
      'Anti-Islanding Protection: Automatic grid disconnect within 2 seconds during grid power failure to safeguard utility linemen.',
      'Lightning Protection & Chemical Earthing: Copper-bonded chemical earthing pits with specialized low-resistivity bentonite compound.',
      'Fire-Retardant UV Conduits: All outdoor wiring housed in heavy-duty UV-stabilized rigid conduits with IP65 weatherproofing.',
      'Surge Protection Devices (SPD): Class II surge arresters on both DC and AC sides guarding against transient surges.'
    ],
    note: ''
  },
  commercial_items: {
    title: 'Commercial Line Items Table',
    subtitle: 'Commercial Line Items & Investment Breakdown',
    text: 'Itemized commercial supply and installation schedule.',
    note: 'Prices are inclusive of standard transportation, mounting hardware, and turnkey EPC installation. GST is charged at an effective rate of 8.9% (70% goods @ 5% + 30% services @ 18%; CGST: 4.45%, SGST: 4.45%). Registered entities are eligible for 100% GST Input Tax Credit (ITC).'
  },
  cost_breakdown: {
    title: 'Project Cost & Subsidy Breakdown',
    subtitle: 'Total Project Cost & Subsidy Summary',
    text: 'Transparent cost summary with government subsidies and net customer investment.',
    note: 'PM Surya Ghar DBT Central Subsidy will be directly transferred to client bank account upon DISCOM net meter commissioning.'
  },
  tax_incentives: {
    title: 'Tax & Policy Incentives',
    subtitle: 'Tax & Policy Incentives for Solar Adoption',
    text: 'Maximize return on investment through applicable government schemes and tax deductions.',
    bullets: [
      'Accelerated Depreciation: 40% depreciation benefit under Section 32 of Income Tax Act for commercial entities.',
      'GST Input Tax Credit (ITC): 100% GST input tax credit claimable on eligible commercial/industrial installations.',
      'Property Tax Rebate: 5% annual property tax rebate offered by municipal corporations for properties with rooftop solar.'
    ],
    note: ''
  },
  financial_forecast: {
    title: '25-Year Financial Forecast',
    subtitle: '25-Year Financial & ROI Forecast',
    text: 'Cumulative financial returns accounting for annual tariff inflation and nominal module degradation.',
    note: 'Calculations assume average 5% grid electricity tariff inflation and conservative 1% annual module degradation.'
  },
  cost_comparison: {
    title: 'Monthly Cost Comparison',
    subtitle: 'Monthly Electricity Cost Comparison',
    text: 'Direct comparison between traditional grid electricity bills and post-solar zero-bill generation.',
    note: ''
  },
  bank_details: {
    title: 'Bank Payment Details',
    subtitle: 'Bank Payment & NEFT / RTGS Transfer Details',
    text: 'Official banking details for electronic fund transfers and account settlement.',
    note: 'Please share transaction UTR reference with our accounts team after transferring funds.'
  },
  scope_matrix: {
    title: 'Scope of Work Responsibilities',
    subtitle: 'Scope of Work & Responsibilities Matrix',
    text: 'Clear division of turnkey EPC responsibilities and customer scope for smooth project execution.',
    bullets: [
      'EPC Scope: Supply of panels, inverter, structure, cables, earthing, DISCOM net metering coordination & commissioning.',
      'Customer Scope: Clear rooftop access, water supply for installation & panel cleaning, DISCOM application actual fees.'
    ],
    note: 'Any additional cabling beyond 50 meters or structural elevation exceeding 10 feet will be charged at actuals.'
  },
  execution_timeline: {
    title: 'Project Execution Timeline',
    subtitle: 'Project Execution Timeline (Turnkey 30 Days)',
    text: 'Systematic 4-week execution cycle from site survey to DISCOM net meter synchronization.',
    bullets: [
      'Week 1 (Day 1–7): Site Survey, Engineering Design, 3D Shadow Analysis & DISCOM Net Metering Application.',
      'Week 2 (Day 8–14): Elevated Structure Assembly, Civil Concrete Foundation Curing & Chemical Earthing Pits.',
      'Week 3 (Day 15–21): Solar Module Mounting, String Inverter Installation, AC/DC Cabling & In-House Testing.',
      'Week 4 (Day 22–30): DISCOM/CEIG Official Inspection, Bi-Directional Net Meter Installation & Plant Handover.'
    ],
    note: 'Net metering approvals are subject to local DISCOM scheduling and grid feasibility.'
  },
  warranty_matrix: {
    title: 'Comprehensive Warranty Matrix',
    subtitle: 'Comprehensive Warranty Matrix',
    text: 'Industry-leading warranty coverage backed directly by original equipment manufacturers and Tejo Bharat.',
    bullets: [
      'Solar PV Modules: 25-Year Linear Power Warranty (guaranteeing ≥80% output at Year 25).',
      'Solar String Inverter: 7–10 Year Comprehensive Product Replacement Warranty with optional 20-yr extension.',
      'Elevated Mounting Structure: 10-Year Anti-Rust & Corrosion Warranty (Hot-Dip Galvanized 80+ micron zinc).',
      'Workmanship & Installation: 5-Year Tejo Bharat AMC warranty with local service technicians.'
    ],
    note: 'Warranty certificates and warranty cards are handed over upon final system commissioning.'
  },
  telemetry_sop: {
    title: 'Remote Monitoring & Maintenance SOP',
    subtitle: 'Mobile Remote Telemetry App & Maintenance Protocol',
    text: '24/7 Smart App monitoring on iOS and Android with routine preventive maintenance procedures.',
    bullets: [
      'Smart App Dashboard: Track live kW output, daily generation, monthly export, and instant fault alerts on your smartphone.',
      'Cleaning Protocol: Clean panel surface with fresh soft water every 15 days in early morning or late evening.',
      'Annual Checkup: Annual electrical torque check and chemical earthing pit resistance measurement by Tejo Bharat team.'
    ],
    note: ''
  },
  policy_summary: {
    title: 'Government Policy & Net Metering',
    subtitle: 'Government Policy, Tax & Property Tax Benefits',
    text: 'Applicable central government subsidies, state net metering regulations, and civic tax rebates.',
    bullets: [
      'PM Surya Ghar Central Subsidy: Direct DBT credit for residential consumers credited directly to bank account.',
      'Net Metering Settlement: Bi-directional energy meter records export and import units for zero net electricity bills.',
      '5% Property Tax Rebate: Urban Local Bodies and Municipal Corporations offer 5% annual property tax rebate for solar rooftops.',
      'Commercial Depreciation: 40% Accelerated Depreciation under Section 32 of IT Act + GST Input Tax Credit.'
    ],
    note: ''
  },
  payment_milestones: {
    title: 'Commercial Payment Milestones',
    subtitle: 'Commercial Payment Milestones',
    text: 'Milestone-linked transparent payment schedule protecting client investment at every stage.',
    bullets: [
      'Stage 1 (60% Advance Payment): Upon Purchase Order signing & procurement booking.',
      'Stage 2 (30% Dispatch Payment): Upon hardware delivery and arrival of materials at installation site.',
      'Stage 3 (10% Final Payment): Post DISCOM net meter synchronization, testing, and official plant handover.'
    ],
    note: 'Invoices with GST tax breakdown will be raised alongside each milestone payment.'
  },
  terms_conditions: {
    title: 'Terms & Conditions of Supply',
    subtitle: 'Standard Commercial Terms & Conditions',
    text: 'Standard commercial conditions governing equipment supply, installation, and after-sales warranty.',
    bullets: [
      'Validity: This proposal is valid for 15 days from the date of issuance.',
      'DISCOM Feasibility: Net metering approval is subject to DISCOM transformer capacity and grid feasibility.',
      'Site Readiness: Client shall provide clear, unshaded rooftop access, water supply, and temporary power for tools.',
      'Force Majeure: Delays resulting from natural calamities, severe weather, or government policy revisions are excluded from EPC timeline.',
      'Statutory Taxes: Goods and Services Tax (GST) applied as per prevailing government tax slabs on the invoice date.',
      'DBT Subsidy: Central subsidy release timeline is governed by the national PM Surya Ghar portal processing.'
    ],
    note: 'Any civil alterations, rooftop waterproofing, or tree trimming are outside EPC scope unless explicitly agreed in writing.'
  },
  thank_you_signatures: {
    title: 'Order Acceptance & Signatures',
    subtitle: 'Thank You & Acceptance Signatures',
    text: 'Thank you for choosing Tejo Bharat Global Energy LLP! We appreciate your commitment to clean, sustainable solar energy. Our engineering team is dedicated to top-tier installation quality and ensuring your solar investment pays back in the shortest possible time.',
    note: 'Generation estimates are calculated using regional solar insolation data (~5.0 kWh/m²/day average). Actual generation may vary ±10% based on ambient conditions, shading, and DISCOM grid uptime.'
  }
};

export interface ScopeItem {
  id: string;
  text: string;
  scope: 'epc' | 'customer';
}

export const DEFAULT_SCOPE_ITEMS: ScopeItem[] = [
  { id: 'epc-1', text: 'Supply & delivery of solar modules & string inverter.', scope: 'epc' },
  { id: 'epc-2', text: 'Assembly of HDG elevated mounting structure (6ft–10ft clearance).', scope: 'epc' },
  { id: 'epc-3', text: 'DC & AC wiring, conduits (Permissible wiring up to 50 meters included).', scope: 'epc' },
  { id: 'epc-4', text: 'Chemical earthing pits & Lightning Arrester (LA) setup.', scope: 'epc' },
  { id: 'epc-5', text: 'DISCOM net metering coordination, CEIG inspection & testing.', scope: 'epc' },
  { id: 'epc-6', text: 'Commissioning, handover & inverter app setup & training.', scope: 'epc' },
  { id: 'cust-1', text: 'Clear, unshaded rooftop access for installation crew.', scope: 'customer' },
  { id: 'cust-2', text: 'Civil foundation concrete block curing & rooftop waterproofing.', scope: 'customer' },
  { id: 'cust-3', text: 'DISCOM official meter testing & application fees (actuals).', scope: 'customer' },
  { id: 'cust-4', text: 'Continuous Wi-Fi internet connection at inverter location.', scope: 'customer' },
  { id: 'cust-5', text: 'Safe storage for solar components during installation.', scope: 'customer' },
  { id: 'cust-6', text: 'Electricity & water supply during installation period.', scope: 'customer' },
];

export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'hyd-hq',
    code: 'HYD',
    name: 'Tejo Bharat Hyderabad HQ',
    company_name: 'TEJO BHARAT GLOBAL ENERGY LLP',
    address: 'N V Homes, Moosapet, Hyderabad, Telangana',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500018',
    phone: '+91 94797 97947',
    email: 'contact@tejobharat.com',
    website: 'www.tejobharat.com',
    gstin: '36AAUFT4289K1ZE',
    cin: 'ACQ-2334',
    pan: 'AAYFT4513H',
    signatory_title: 'Authorized Signatory',
    is_default: true,
  },
  {
    id: 'pith-ap',
    code: 'PITH',
    name: 'Tejo Bharat Pithapuram Branch',
    company_name: 'TEJO BHARAT GLOBAL ENERGY LLP',
    address: 'Seethayya Gari Thota, Pithapuram, Kakinada District, Andhra Pradesh',
    city: 'Pithapuram',
    state: 'Andhra Pradesh',
    pincode: '533450',
    phone: '+91 94797 97947',
    email: 'contact@tejobharat.com',
    website: 'www.tejobharat.com',
    gstin: '37AAYFT4513H1ZO',
    cin: 'ACQ-2334',
    pan: 'AAYFT4513H',
    signatory_title: 'Authorized Signatory',
  }
];

export interface Party {
  id?: string;
  name: string;
  mobile_number?: string;
  email?: string;
  gstin?: string;
  pan_number?: string;
  party_type: 'Customer' | 'Supplier';
  party_category?: string;
  opening_balance?: number;
  opening_balance_type?: 'To Collect' | 'To Pay';
  billing_address?: string;
  shipping_address?: string;
  same_as_billing?: boolean;
  credit_period_days?: number;
  credit_limit?: number;
  contact_person_name?: string;
  date_of_birth?: string;
  balance?: number;
  balance_type?: 'To Collect' | 'To Pay';
  created_at?: string;
}

export const DEFAULT_PARTIES: Party[] = [
  {
    id: 'p-rambabu',
    name: 'M/S SAAGHAR INFRA P LTD',
    mobile_number: '9177685040',
    party_type: 'Customer',
    party_category: 'Commercial Solar',
    billing_address: 'SY NO.498/E, NARAYANA REDDY COLONY, AMEENPUR',
    shipping_address: 'SY NO.498/E, NARAYANA REDDY COLONY, AMEENPUR',
    same_as_billing: true,
    balance: 700000,
    balance_type: 'To Collect',
  },
  {
    id: 'p-1',
    name: 'TEJO BHARAT GLOBAL ENERGY LLP',
    mobile_number: '9479797947',
    email: 'contact@tejobharat.com',
    gstin: '37AAYFT4513H1ZO',
    pan_number: 'AAYFT4513H',
    party_type: 'Customer',
    party_category: 'Commercial Solar',
    opening_balance: 0,
    opening_balance_type: 'To Collect',
    billing_address: '6-140, RAMALAYAM, KOTHA PETA, Durgada, Kakinada, East Godavari, AP, 533449',
    shipping_address: '6-140, RAMALAYAM, KOTHA PETA, Durgada, Kakinada, East Godavari, AP, 533449',
    same_as_billing: true,
    credit_period_days: 30,
    credit_limit: 500000,
    contact_person_name: 'Durga Prasad',
    balance: 24554368,
    balance_type: 'To Collect',
  },
  {
    id: 'p-2',
    name: 'A,NAGALATHA',
    mobile_number: '8143000999',
    party_type: 'Customer',
    balance: 220000,
    balance_type: 'To Collect',
  },
  {
    id: 'p-3',
    name: 'A,SUBHASHINI',
    mobile_number: '9393515432',
    party_type: 'Customer',
    balance: 0,
    balance_type: 'To Collect',
  },
  {
    id: 'p-4',
    name: 'A.SRINIVASARAO',
    mobile_number: '9440508526',
    party_type: 'Customer',
    balance: 0,
    balance_type: 'To Collect',
  },
  {
    id: 'p-5',
    name: 'ADAPA LAKSHMI PRAKASH',
    mobile_number: '8978955454',
    party_type: 'Customer',
    balance: 0,
    balance_type: 'To Collect',
  },
  {
    id: 'p-6',
    name: 'ADAPA VENKATA RAMANA',
    mobile_number: '6302299593',
    party_type: 'Customer',
    balance: 60000,
    balance_type: 'To Collect',
  }
];

export const PANEL_BRANDS = [
  'Premier / Waaree / Adani / ReNew (500+ W Mono DCR)',
  'Premier Solar (500+ W DCR Mono PERC)',
  'Waaree Energies (500+ W DCR Mono PERC)',
  'Adani Solar (500+ W Mono PERC)',
  'Vikram Solar (500+ W TOPCon Bifacial)',
  'Goldi Solar (500+ W Mono PERC)',
  'Rayzon Solar (500+ W DCR Mono PERC)',
  'Gautam Solar (500+ W DCR)',
  'ReNew Power (500+ W Mono PERC)'
];

export const INVERTER_BRANDS = [
  'Deye Inverter',
  'Polycab Solar Inverter',
  'Solis String Inverter',
  'Growatt Solar Inverter',
  'GoodWe Solar Inverter',
  'Havells Solar Inverter',
  'Sungrow Inverter',
  'Microtek Solar Inverter',
  'Luminous Solar Inverter',
  'V-Guard Solar Inverter',
  'Delta Inverter'
];

export const INVERTER_PHASES = [
  'Three Phase (3-Phase)',
  'Single Phase (1-Phase)',
  '1-Phase / 3-Phase Auto'
];

export const STRUCTURE_GRIDS = [
  '3x5 (15 Modules Table)',
  '3x4 (12 Modules Table)',
  '2x10 (20 Modules Table)',
  '4x6 (24 Modules Table)',
  '2x5 (10 Modules Table)',
  'Custom Modular Layout'
];

export const STRUCTURE_HEIGHTS = [
  'Elevated Superstructure (6ft–10ft Height)',
  'Elevated Superstructure (6ft Height)',
  'Elevated Superstructure (8ft Height)',
  'Elevated Superstructure (10ft Height)',
  'Elevated Superstructure (12ft Height)',
  'Standard Rooftop Short Rail (0.5ft–1ft Height)',
  'Flush Roof Mount Structure',
  'Ground Mount Structure (4ft–6ft Height)'
];

export const STRUCTURE_TYPES = [
  'Hot-Dip Galvanized (HDG) Steel Superstructure (80+ Micron Zinc)',
  'Galvanized Iron (GI) HDG Structure',
  'Aluminum High Structure',
  'Ground Mounted Heavy Structure',
  'Standard Rooftop Short Rail'
];

export const CABLE_BRANDS = [
  'Polycab Solar DC & Armored AC Cables',
  'Havells Solar DC & AC Armored Cables',
  'KEI Industries Solar Cables',
  'Finolex Solar Cables',
  'RP SG Solar Armored Cables'
];


export interface Item {
  id?: string;
  item_type: 'Product' | 'Service';
  name: string;
  category?: string;
  item_code?: string;
  hsn_code?: string;
  measuring_unit?: string;
  selling_price?: number;
  selling_price_tax_type?: 'With Tax' | 'Without Tax';
  purchase_price?: number;
  gst_rate_percent?: number;
  opening_stock?: number;
  as_of_date?: string;
  low_stock_warning?: number;
  description?: string;
  created_at?: string;
}

export const DEFAULT_ITEMS: Item[] = [
  {
    id: 'itm-1',
    item_type: 'Product',
    name: '07 kw on grid solar system',
    category: 'Solar Plant Package',
    item_code: 'ITM-07KW',
    hsn_code: '85414011',
    measuring_unit: 'Pieces(PCS)',
    selling_price: 480000,
    selling_price_tax_type: 'With Tax',
    gst_rate_percent: 8.9,
    opening_stock: 0,
    description: 'Complete 7KW Commercial On-Grid Solar System with Deye Inverter & Mono PERC panels'
  },
  {
    id: 'itm-2',
    item_type: 'Product',
    name: '09 Kw on grid solar system',
    category: 'Solar Plant Package',
    item_code: 'ITM-09KW',
    hsn_code: '85414011',
    measuring_unit: 'Pieces(PCS)',
    selling_price: 560000,
    selling_price_tax_type: 'With Tax',
    gst_rate_percent: 8.9,
    opening_stock: 0,
  },
  {
    id: 'itm-3',
    item_type: 'Product',
    name: '10 Kw on grid solar system',
    category: 'Solar Plant Package',
    item_code: 'ITM-10KW',
    hsn_code: '85414011',
    measuring_unit: 'Pieces(PCS)',
    selling_price: 600000,
    selling_price_tax_type: 'With Tax',
    gst_rate_percent: 8.9,
    opening_stock: 0,
  },
  {
    id: 'itm-4',
    item_type: 'Product',
    name: '2 kw solar system',
    category: 'Solar Plant Package',
    item_code: 'ITM-02KW',
    hsn_code: '85414011',
    measuring_unit: 'Pieces(PCS)',
    selling_price: 170000,
    selling_price_tax_type: 'With Tax',
    gst_rate_percent: 8.9,
    opening_stock: 0,
  },
  {
    id: 'itm-5',
    item_type: 'Product',
    name: '20 kw On Grid Solar System',
    category: 'Solar Plant Package',
    item_code: 'ITM-20KW',
    hsn_code: '85414011',
    measuring_unit: 'Pieces(PCS)',
    selling_price: 960000,
    selling_price_tax_type: 'With Tax',
    gst_rate_percent: 8.9,
    opening_stock: 0,
  },
  {
    id: 'itm-6',
    item_type: 'Product',
    name: '25 kW On Grid Solar System',
    category: 'Solar Plant Package',
    item_code: 'ITM-25KW',
    hsn_code: '85414011',
    measuring_unit: 'Pieces(PCS)',
    selling_price: 1200000,
    selling_price_tax_type: 'With Tax',
    gst_rate_percent: 8.9,
    opening_stock: 0,
  },
  {
    id: 'itm-7',
    item_type: 'Product',
    name: '3 Kw DCR, 3 Kw Non DCR On Grid Solar System',
    category: 'Solar Plant Package',
    item_code: 'ITM-03KWDCR',
    hsn_code: '85414011',
    measuring_unit: 'Pieces(PCS)',
    selling_price: 33000,
    selling_price_tax_type: 'With Tax',
    gst_rate_percent: 8.9,
    opening_stock: 0,
  }
];
