import { supabase } from './supabase';

export interface State {
  id: number;
  name: string;
  code?: string;
  tenant_id: string;
  created_at: string;
}

export interface District {
  id: number;
  state_id: number;
  name: string;
  tenant_id: string;
  created_at: string;
}

export interface Constituency {
  id: number;
  district_id: number;
  name: string;
  parliament_constituency_id?: number;
  parliament_constituency_name?: string;
  tenant_id: string;
  created_at: string;
}

export interface Mandal {
  id: number;
  constituency_id: number;
  name: string;
  tenant_id: string;
  created_at: string;
}

export interface Village {
  id: number;
  mandal_id: number;
  name: string;
  name_telugu?: string;
  area_category: string;
  total_wards: number;
  tenant_id: string;
  created_at: string;
}

export interface LocationHierarchy {
  state?: State;
  district?: District;
  constituency?: Constituency;
  mandal?: Mandal;
  village?: Village;
}

export const locationApi = {
  async getStates(): Promise<State[]> {
    const { data, error } = await supabase
      .from('states')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getDistrictsByState(stateId: number): Promise<District[]> {
    const { data, error } = await supabase
      .from('districts')
      .select('*')
      .eq('state_id', stateId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getConstituenciesByDistrict(districtId: number): Promise<Constituency[]> {
    const { data, error } = await supabase
      .from('constituencies')
      .select('*')
      .eq('district_id', districtId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getMandalsByConstituency(constituencyId: number): Promise<Mandal[]> {
    const { data, error } = await supabase
      .from('mandals')
      .select('*')
      .eq('constituency_id', constituencyId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getVillagesByMandal(mandalId: number): Promise<Village[]> {
    const { data, error } = await supabase
      .from('villages')
      .select('*')
      .eq('mandal_id', mandalId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async getLocationHierarchy(villageId?: number): Promise<LocationHierarchy> {
    if (!villageId) return {};

    const { data: village, error: villageError } = await supabase
      .from('villages')
      .select(`
        *,
        mandals:mandal_id (
          *,
          constituencies:constituency_id (
            *,
            districts:district_id (
              *,
              states:state_id (*)
            )
          )
        )
      `)
      .eq('id', villageId)
      .maybeSingle();

    if (villageError) throw villageError;
    if (!village) return {};

    const mandal = village.mandals as any;
    const constituency = mandal?.constituencies as any;
    const district = constituency?.districts as any;
    const state = district?.states as any;

    return {
      village,
      mandal,
      constituency,
      district,
      state
    };
  },

  async importLocationsFromJSON(jsonData: any, tenantId: string): Promise<{
    success: boolean;
    message: string;
    stats: {
      states: number;
      districts: number;
      constituencies: number;
      mandals: number;
      villages: number;
      updated: number;
      created: number;
    };
  }> {
    const stats = {
      states: 0,
      districts: 0,
      constituencies: 0,
      mandals: 0,
      villages: 0,
      updated: 0,
      created: 0
    };

    try {
      if (!jsonData.states || !Array.isArray(jsonData.states)) {
        throw new Error('Invalid JSON format: missing states array');
      }

      for (const stateData of jsonData.states) {
        const stateId = stateData.id || stateData.state_id || 1;
        const stateName = stateData.name || stateData.state_name || 'Unknown';

        if (stateName !== 'Andhra Pradesh') {
          console.log(`Skipping state: ${stateName}`);
          continue;
        }

        const { data: existingState } = await supabase
          .from('states')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('id', stateId)
          .maybeSingle();

        const { error: stateError } = await supabase
          .from('states')
          .upsert({
            id: stateId,
            name: stateName,
            code: stateData.code || 'AP',
            tenant_id: tenantId
          }, {
            onConflict: 'tenant_id,id',
            ignoreDuplicates: false
          });

        if (stateError) throw stateError;
        stats.states++;
        if (existingState) {
          stats.updated++;
        } else {
          stats.created++;
        }

        if (stateData.districts && Array.isArray(stateData.districts)) {
          for (const districtData of stateData.districts) {
            const { data: existingDistrict } = await supabase
              .from('districts')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('id', districtData.id)
              .maybeSingle();

            const { error: districtError } = await supabase
              .from('districts')
              .upsert({
                id: districtData.id,
                state_id: stateId,
                name: districtData.district_name || districtData.name,
                tenant_id: tenantId
              }, {
                onConflict: 'tenant_id,id',
                ignoreDuplicates: false
              });

            if (districtError) throw districtError;
            stats.districts++;
            if (existingDistrict) {
              stats.updated++;
            } else {
              stats.created++;
            }

            if (districtData.constituencies && Array.isArray(districtData.constituencies)) {
              for (const constituencyData of districtData.constituencies) {
                const constituencyId = constituencyData.id || constituencyData.constituency_id;

                const { data: existingConstituency } = await supabase
                  .from('constituencies')
                  .select('id')
                  .eq('tenant_id', tenantId)
                  .eq('id', constituencyId)
                  .maybeSingle();

                const { error: constituencyError } = await supabase
                  .from('constituencies')
                  .upsert({
                    id: constituencyId,
                    district_id: districtData.id,
                    name: constituencyData.constituency_name || constituencyData.name,
                    parliament_constituency_id: constituencyData.parliament_constituency_id,
                    parliament_constituency_name: constituencyData.parliament_constituency_name,
                    tenant_id: tenantId
                  }, {
                    onConflict: 'tenant_id,id',
                    ignoreDuplicates: false
                  });

                if (constituencyError) throw constituencyError;
                stats.constituencies++;
                if (existingConstituency) {
                  stats.updated++;
                } else {
                  stats.created++;
                }

                if (constituencyData.mandals && Array.isArray(constituencyData.mandals)) {
                  for (const mandalData of constituencyData.mandals) {
                    const { data: existingMandal } = await supabase
                      .from('mandals')
                      .select('id')
                      .eq('tenant_id', tenantId)
                      .eq('id', mandalData.id)
                      .maybeSingle();

                    const { error: mandalError } = await supabase
                      .from('mandals')
                      .upsert({
                        id: mandalData.id,
                        constituency_id: constituencyId,
                        name: mandalData.mandal_name || mandalData.name,
                        tenant_id: tenantId
                      }, {
                        onConflict: 'tenant_id,id',
                        ignoreDuplicates: false
                      });

                    if (mandalError) throw mandalError;
                    stats.mandals++;
                    if (existingMandal) {
                      stats.updated++;
                    } else {
                      stats.created++;
                    }

                    if (mandalData.panchayats && Array.isArray(mandalData.panchayats)) {
                      const villageBatch = mandalData.panchayats.map((villageData: any) => ({
                        id: villageData.id,
                        mandal_id: mandalData.id,
                        name: villageData.name,
                        name_telugu: villageData.name_telugu,
                        area_category: villageData.area_category || 'Rural/Panchayat',
                        total_wards: villageData.total_wards || 0,
                        tenant_id: tenantId
                      }));

                      const { error: villageError } = await supabase
                        .from('villages')
                        .upsert(villageBatch, {
                          onConflict: 'tenant_id,id',
                          ignoreDuplicates: false
                        });

                      if (villageError) throw villageError;
                      stats.villages += villageBatch.length;
                      stats.created += villageBatch.length;
                    }
                  }
                }
              }
            }
          }
        }
      }

      return {
        success: true,
        message: 'Location data imported successfully',
        stats
      };
    } catch (error: any) {
      console.error('Import error:', error);
      return {
        success: false,
        message: error.message || 'Failed to import location data',
        stats
      };
    }
  },

  async searchLocations(searchTerm: string, limit: number = 50): Promise<{
    states: State[];
    districts: District[];
    constituencies: Constituency[];
    mandals: Mandal[];
    villages: any[];
  }> {
    console.log('=== SEARCH LOCATIONS START ===');
    console.log('Search term:', searchTerm);
    console.log('Limit:', limit);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('User auth result:', { hasUser: !!user, userError });

    if (userError) {
      console.error('Error getting user:', userError);
      throw userError;
    }
    if (!user) {
      console.log('No user found - returning empty results');
      return { states: [], districts: [], constituencies: [], mandals: [], villages: [] };
    }

    // Call the RPC function directly - it will determine tenant_id from auth.uid()
    console.log('Calling search_villages_with_hierarchy RPC...');
    const villagesResult = await supabase.rpc('search_villages_with_hierarchy', {
      search_term: searchTerm,
      user_tenant_id: null,
      result_limit: limit
    });

    console.log('RPC result:', {
      error: villagesResult.error,
      dataLength: villagesResult.data?.length,
      firstResult: villagesResult.data?.[0]
    });

    if (villagesResult.error) {
      console.error('Error searching villages:', villagesResult.error);
      console.error('Error details:', JSON.stringify(villagesResult.error, null, 2));
      throw villagesResult.error;
    }

    console.log('Villages found with hierarchy:', villagesResult.data?.length || 0);
    if (villagesResult.data?.[0]) {
      console.log('Sample village data:', villagesResult.data[0]);
      console.log('Sample village keys:', Object.keys(villagesResult.data[0]));
    }
    console.log('=== SEARCH LOCATIONS END ===');

    // The RPC function returns villages with full hierarchy data
    return {
      states: [],
      districts: [],
      constituencies: [],
      mandals: [],
      villages: villagesResult.data || []
    };
  }
};
