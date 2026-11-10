export function resolveSupabaseServiceKey(rootDir: string, envObj?: Record<string, string>): string;

export function rebuildVendorIntelligenceAndRanking(master: any): {
  chainsProcessed: number;
  entitiesTracked: number;
  manufacturersCount: number;
};

export function compactDcrMasterForStorage(master: any): number;

export function writeJsonAtomic(targetPath: string, data: any): void;

export function uploadDcrMasterToSupabaseStorage(
  supabase: any,
  data: any
): Promise<{ rawBytes: number; gzipBytes: number }>;
