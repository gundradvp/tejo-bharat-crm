import React, { useEffect, useState } from 'react';
import { MapPin, ChevronRight, X } from 'lucide-react';
import { useStates, useDistricts, useConstituencies, useMandals, useVillages, useLocationHierarchy } from '../../hooks/useLocations';

interface CascadingLocationSelectorProps {
  stateId?: number;
  districtId?: number;
  constituencyId?: number;
  mandalId?: number;
  villageId?: number;
  onChange: (location: {
    stateId?: number;
    districtId?: number;
    constituencyId?: number;
    mandalId?: number;
    villageId?: number;
    stateName?: string;
    districtName?: string;
    constituencyName?: string;
    mandalName?: string;
    villageName?: string;
  }) => void;
  required?: boolean;
  showLabels?: boolean;
  showHierarchy?: boolean;
  enableDirectVillageSearch?: boolean;
}

export default function CascadingLocationSelector({
  stateId,
  districtId,
  constituencyId,
  mandalId,
  villageId,
  onChange,
  required = false,
  showLabels = true,
  showHierarchy = true,
  enableDirectVillageSearch = true
}: CascadingLocationSelectorProps) {
  const [selectedState, setSelectedState] = useState<number | undefined>(stateId);
  const [selectedDistrict, setSelectedDistrict] = useState<number | undefined>(districtId);
  const [selectedConstituency, setSelectedConstituency] = useState<number | undefined>(constituencyId);
  const [selectedMandal, setSelectedMandal] = useState<number | undefined>(mandalId);
  const [selectedVillage, setSelectedVillage] = useState<number | undefined>(villageId);

  const [showDirectSearch, setShowDirectSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const { states, loading: statesLoading } = useStates();
  const { districts, loading: districtsLoading } = useDistricts(selectedState);
  const { constituencies, loading: constituenciesLoading } = useConstituencies(selectedDistrict);
  const { mandals, loading: mandalsLoading } = useMandals(selectedConstituency);
  const { villages, loading: villagesLoading } = useVillages(selectedMandal);
  const { hierarchy, loading: hierarchyLoading } = useLocationHierarchy(selectedVillage);

  useEffect(() => {
    setSelectedState(stateId);
  }, [stateId]);

  useEffect(() => {
    setSelectedDistrict(districtId);
  }, [districtId]);

  useEffect(() => {
    setSelectedConstituency(constituencyId);
  }, [constituencyId]);

  useEffect(() => {
    setSelectedMandal(mandalId);
  }, [mandalId]);

  useEffect(() => {
    setSelectedVillage(villageId);
  }, [villageId]);

  useEffect(() => {
    if (hierarchy && selectedVillage) {
      const newState = hierarchy.state?.id;
      const newDistrict = hierarchy.district?.id;
      const newConstituency = hierarchy.constituency?.id;
      const newMandal = hierarchy.mandal?.id;

      if (newState && newState !== selectedState) {
        setSelectedState(newState);
      }
      if (newDistrict && newDistrict !== selectedDistrict) {
        setSelectedDistrict(newDistrict);
      }
      if (newConstituency && newConstituency !== selectedConstituency) {
        setSelectedConstituency(newConstituency);
      }
      if (newMandal && newMandal !== selectedMandal) {
        setSelectedMandal(newMandal);
      }

      onChange({
        stateId: newState,
        districtId: newDistrict,
        constituencyId: newConstituency,
        mandalId: newMandal,
        villageId: selectedVillage,
        stateName: hierarchy.state?.name,
        districtName: hierarchy.district?.name,
        constituencyName: hierarchy.constituency?.name,
        mandalName: hierarchy.mandal?.name,
        villageName: hierarchy.village?.name
      });
    }
  }, [hierarchy]);

  const handleStateChange = (value: string) => {
    const newStateId = value ? parseInt(value) : undefined;
    setSelectedState(newStateId);
    setSelectedDistrict(undefined);
    setSelectedConstituency(undefined);
    setSelectedMandal(undefined);
    setSelectedVillage(undefined);
    onChange({
      stateId: newStateId,
      districtId: undefined,
      constituencyId: undefined,
      mandalId: undefined,
      villageId: undefined
    });
  };

  const handleDistrictChange = (value: string) => {
    const newDistrictId = value ? parseInt(value) : undefined;
    setSelectedDistrict(newDistrictId);
    setSelectedConstituency(undefined);
    setSelectedMandal(undefined);
    setSelectedVillage(undefined);
    onChange({
      stateId: selectedState,
      districtId: newDistrictId,
      constituencyId: undefined,
      mandalId: undefined,
      villageId: undefined
    });
  };

  const handleConstituencyChange = (value: string) => {
    const newConstituencyId = value ? parseInt(value) : undefined;
    setSelectedConstituency(newConstituencyId);
    setSelectedMandal(undefined);
    setSelectedVillage(undefined);
    onChange({
      stateId: selectedState,
      districtId: selectedDistrict,
      constituencyId: newConstituencyId,
      mandalId: undefined,
      villageId: undefined
    });
  };

  const handleMandalChange = (value: string) => {
    const newMandalId = value ? parseInt(value) : undefined;
    setSelectedMandal(newMandalId);
    setSelectedVillage(undefined);
    onChange({
      stateId: selectedState,
      districtId: selectedDistrict,
      constituencyId: selectedConstituency,
      mandalId: newMandalId,
      villageId: undefined
    });
  };

  const handleVillageChange = (value: string) => {
    const newVillageId = value ? parseInt(value) : undefined;
    setSelectedVillage(newVillageId);
  };

  const handleDirectVillageSearch = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { locationApi } = await import('../../lib/locationApi');
      console.log('=== VILLAGE SEARCH DEBUG ===');
      console.log('1. Search term:', term);
      const results = await locationApi.searchLocations(term, 20);
      console.log('2. API returned results:', results);
      console.log('3. Villages array:', results.villages);
      console.log('4. First village:', results.villages?.[0]);
      console.log('5. First village keys:', results.villages?.[0] ? Object.keys(results.villages[0]) : 'no village');
      setSearchResults(results.villages || []);
      console.log('6. State updated with villages:', results.villages?.length || 0);
    } catch (error: any) {
      console.error('Search error:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleDirectVillageSelect = (village: any) => {
    console.log('=== Direct Village Selection ===');
    console.log('Selected village data:', village);

    setSelectedState(village.state_id);
    setSelectedDistrict(village.district_id);
    setSelectedConstituency(village.constituency_id);
    setSelectedMandal(village.mandal_id);
    setSelectedVillage(village.id);

    onChange({
      stateId: village.state_id,
      districtId: village.district_id,
      constituencyId: village.constituency_id,
      mandalId: village.mandal_id,
      villageId: village.id,
      stateName: village.state_name,
      districtName: village.district_name,
      constituencyName: village.constituency_name,
      mandalName: village.mandal_name,
      villageName: village.name
    });

    setSearchTerm('');
    setSearchResults([]);
    setShowDirectSearch(false);
  };

  const getStateName = () => states.find(s => s.id === selectedState)?.name;
  const getDistrictName = () => districts.find(d => d.id === selectedDistrict)?.name;
  const getConstituencyName = () => constituencies.find(c => c.id === selectedConstituency)?.name;
  const getMandalName = () => mandals.find(m => m.id === selectedMandal)?.name;
  const getVillageName = () => villages.find(v => v.id === selectedVillage)?.name;

  return (
    <div className="space-y-4">
      {enableDirectVillageSearch && !showDirectSearch && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowDirectSearch(true)}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Search Village Directly
          </button>
        </div>
      )}

      {showDirectSearch && (
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Search Village/Panchayat
            </label>
            <button
              type="button"
              onClick={() => {
                setShowDirectSearch(false);
                setSearchTerm('');
                setSearchResults([]);
              }}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Use Hierarchy Selection
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleDirectVillageSearch(e.target.value)}
              placeholder="Type village or panchayat name..."
              className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searching ? (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : searchTerm ? (
              <button
                type="button"
                onClick={() => handleDirectVillageSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
          {searchResults.length > 0 && (
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              {searchResults.map((village, idx) => {
                console.log(`Rendering village ${idx}:`, village);
                console.log(`  - Has mandal_name: ${!!village.mandal_name} (${village.mandal_name})`);
                console.log(`  - Has constituency_name: ${!!village.constituency_name} (${village.constituency_name})`);
                console.log(`  - Has district_name: ${!!village.district_name} (${village.district_name})`);
                console.log(`  - Has state_name: ${!!village.state_name} (${village.state_name})`);
                console.log(`  - All keys:`, Object.keys(village));
                return (
                  <button
                    key={village.id}
                    type="button"
                    onClick={() => handleDirectVillageSelect(village)}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-gray-900">{village.name}</div>
                    {village.name_telugu && (
                      <div className="text-sm text-gray-600 mb-1">{village.name_telugu}</div>
                    )}
                    <div className="text-xs text-gray-500 flex items-center gap-1 flex-wrap">
                      <span className="font-medium">{village.mandal_name || '[NO MANDAL]'}</span>
                      <ChevronRight className="w-3 h-3" />
                      <span>{village.constituency_name || '[NO CONSTITUENCY]'}</span>
                      <ChevronRight className="w-3 h-3" />
                      <span>{village.district_name || '[NO DISTRICT]'}</span>
                      <ChevronRight className="w-3 h-3" />
                      <span>{village.state_name || '[NO STATE]'}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {village.area_category} • {village.total_wards || 0} wards
                    </div>
                    <div className="text-xs text-red-600 font-mono mt-1 p-1 bg-red-50 rounded">
                      DEBUG: mandal={village.mandal_name} const={village.constituency_name} dist={village.district_name} state={village.state_name}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {searchTerm.length >= 2 && !searching && searchResults.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-2">
              No villages found matching "{searchTerm}"
            </div>
          )}
        </div>
      )}

      {showHierarchy && (selectedDistrict || selectedConstituency || selectedMandal || selectedVillage) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center flex-wrap gap-2 text-sm">
            <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
            {getStateName() && (
              <>
                <span className="text-blue-900 font-medium">{getStateName()}</span>
                {getDistrictName() && <ChevronRight className="w-4 h-4 text-blue-400" />}
              </>
            )}
            {getDistrictName() && (
              <>
                <span className="text-blue-800 font-medium">{getDistrictName()}</span>
                {getConstituencyName() && <ChevronRight className="w-4 h-4 text-blue-400" />}
              </>
            )}
            {getConstituencyName() && (
              <>
                <span className="text-blue-700">{getConstituencyName()}</span>
                {getMandalName() && <ChevronRight className="w-4 h-4 text-blue-400" />}
              </>
            )}
            {getMandalName() && (
              <>
                <span className="text-blue-700">{getMandalName()}</span>
                {getVillageName() && <ChevronRight className="w-4 h-4 text-blue-400" />}
              </>
            )}
            {getVillageName() && (
              <span className="text-blue-600 font-semibold">{getVillageName()}</span>
            )}
          </div>
        </div>
      )}

      {!showDirectSearch && (
        <div>
          {showLabels && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State {required && <span className="text-red-500">*</span>}
            </label>
          )}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={selectedState || ''}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required={required}
              disabled={statesLoading}
            >
              <option value="">Select State</option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!showDirectSearch && selectedState && (
        <div>
          {showLabels && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              District {required && <span className="text-red-500">*</span>}
            </label>
          )}
          <select
            value={selectedDistrict || ''}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={required}
            disabled={districtsLoading || districts.length === 0}
          >
            <option value="">Select District</option>
            {districts.map((district) => (
              <option key={district.id} value={district.id}>
                {district.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!showDirectSearch && selectedDistrict && (
        <div>
          {showLabels && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Constituency
            </label>
          )}
          <select
            value={selectedConstituency || ''}
            onChange={(e) => handleConstituencyChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={constituenciesLoading || constituencies.length === 0}
          >
            <option value="">
              {constituenciesLoading ? 'Loading...' : constituencies.length === 0 ? 'No constituencies available' : 'Select Constituency'}
            </option>
            {constituencies.map((constituency) => (
              <option key={constituency.id} value={constituency.id}>
                {constituency.name}
                {constituency.parliament_constituency_name &&
                  ` (${constituency.parliament_constituency_name})`
                }
              </option>
            ))}
          </select>
        </div>
      )}

      {!showDirectSearch && selectedConstituency && (
        <div>
          {showLabels && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mandal
            </label>
          )}
          <select
            value={selectedMandal || ''}
            onChange={(e) => handleMandalChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={mandalsLoading || mandals.length === 0}
          >
            <option value="">
              {mandalsLoading ? 'Loading...' : mandals.length === 0 ? 'No mandals available' : 'Select Mandal'}
            </option>
            {mandals.map((mandal) => (
              <option key={mandal.id} value={mandal.id}>
                {mandal.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {!showDirectSearch && selectedMandal && (
        <div>
          {showLabels && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Village/Panchayat
            </label>
          )}
          <select
            value={selectedVillage || ''}
            onChange={(e) => handleVillageChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={villagesLoading || villages.length === 0}
          >
            <option value="">
              {villagesLoading ? 'Loading...' : villages.length === 0 ? 'No villages available' : 'Select Village/Panchayat'}
            </option>
            {villages.map((village) => (
              <option key={village.id} value={village.id}>
                {village.name}
                {village.name_telugu && ` (${village.name_telugu})`}
                {` - ${village.area_category}`}
              </option>
            ))}
          </select>
        </div>
      )}

      {hierarchyLoading && selectedVillage && (
        <div className="text-sm text-gray-500 text-center py-2">
          Loading location hierarchy...
        </div>
      )}
    </div>
  );
}
