export type PipelineStage = 
  | 'NEW'
  | 'CONTACTED'
  | 'INTERESTED'
  | 'QUOTE_SENT'
  | 'FOLLOW_UP'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  | 'DO_NOT_CALL';

export type Priority = 'HOT' | 'WARM' | 'COLD' | 'NORMAL';

export type CallOutcome = 
  | 'ANSWERED'
  | 'BUSY'
  | 'NO_ANSWER'
  | 'SWITCHED_OFF'
  | 'CALLBACK_REQUESTED'
  | 'WRONG_NUMBER';

export interface VendorBrand {
  brandName: string;
  brandId?: number;
  documentUrl?: string | null;
}

export interface SolarRequirement {
  estimatedMonthlyKW?: number;
  preferredPanelType?: string;
  quotedPricePerWatt?: number;
  currentSupplier?: string;
}

export interface VendorNote {
  id: string;
  vendorId: number;
  district: string;
  createdAt: string;
  callOutcome?: CallOutcome | string;
  content: string;
  nextFollowUpDate?: string | null;
  stageChange?: PipelineStage;
  priorityChange?: Priority;
  solarRequirement?: SolarRequirement;
  author?: string;
}

export interface VendorContact {
  vendorId: number;
  vendorName: string;
  contactPersonName: string;
  contactPersonMobile: string;
  contactPersonEmail: string;
  address: string;
  websiteUrl: string;
  rating?: number | null;
  consumerRatingCount?: number;
  brands: string[];
  district: string;
  nationalCapacityKW?: number;
  nationalInstallations?: number;
  districtCapacityKW?: number;
  districtInstallations?: number;
  
  // DCR Supply Chain Intelligence Linkage
  dcrTracked?: boolean;
  dcrInboundPanels?: number;
  dcrOutboundPanels?: number;
  dcrManufacturers?: string[];
  dcrSuppliers?: string[];
  dcrBuyers?: string[];
}

export interface VendorItem extends VendorContact {
  uniqueKey: string;
  pipelineStage: PipelineStage;
  priority: Priority;
  lastCallOutcome?: CallOutcome | null;
  lastContactedAt?: string | null;
  nextFollowUpDate?: string | null;
  solarRequirement?: SolarRequirement;
  tags: string[];
  notes: VendorNote[];
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DistrictSummary {
  id: string;
  name: string;
  totalVendors: number;
  contactedCount: number;
  interestedCount: number;
  fileName: string;
  importedAt: string;
}

export interface ContactsMasterData {
  summary: {
    total_vendors: number;
    total_with_mobile: number;
    default_district: string;
    districts: string[];
  };
  vendors: VendorContact[];
  indices: {
    by_norm_name: Record<string, number>;
    by_exact_lower: Record<string, number>;
    by_mobile: Record<string, number>;
    by_vendor_id: Record<string, number>;
  };
}
