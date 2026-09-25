import React, { useState } from 'react';
import { MapPin, Upload, Search, ChevronRight, ChevronDown, Plus, CreditCard as Edit2, Trash2 } from 'lucide-react';
import { locationApi, State, District, Constituency, Mandal, Village } from '../../lib/locationApi';
import { useStates } from '../../hooks/useLocations';
import { useTenant } from '../../contexts/TenantContext';

export default function LocationManagement() {
  const { tenant } = useTenant();
  const [activeTab, setActiveTab] = useState<'browse' | 'import' | 'search'>('browse');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<string>('');
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!importFile || !tenant) return;

    setImporting(true);
    setImportStatus('Reading file...');

    try {
      const text = await importFile.text();
      const jsonData = JSON.parse(text);

      setImportStatus('Importing data...');
      const result = await locationApi.importLocationsFromJSON(jsonData, tenant.id);

      if (result.success) {
        setImportStatus(
          `Import successful!

Total Records Processed:
  • States: ${result.stats.states}
  • Districts: ${result.stats.districts}
  • Constituencies: ${result.stats.constituencies}
  • Mandals: ${result.stats.mandals}
  • Villages: ${result.stats.villages}

Summary:
  • Created: ${result.stats.created} new records
  • Updated: ${result.stats.updated} existing records`
        );
      } else {
        setImportStatus(`Import failed: ${result.message}`);
      }
    } catch (error: any) {
      setImportStatus(`Error: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    try {
      const results = await locationApi.searchLocations(searchTerm);
      setSearchResults(results);
    } catch (error: any) {
      console.error('Search error:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <MapPin className="w-8 h-8" />
          Location Master Data
        </h1>
        <p className="mt-2 text-gray-600">
          Manage hierarchical location data for lead generators
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'browse'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Browse Locations
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'import'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Import Data
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'search'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Search
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'browse' && <LocationBrowser />}

          {activeTab === 'import' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Import Location Data from JSON</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload a JSON file containing hierarchical location data (States → Districts → Constituencies → Mandals → Villages)
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      {importFile ? importFile.name : 'Choose a JSON file'}
                    </span>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setImportFile(file);
                      }}
                    />
                    <span className="mt-1 block text-xs text-gray-500">
                      or drag and drop
                    </span>
                  </label>
                </div>
              </div>

              {importFile && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Import Data'}
                </button>
              )}

              {importStatus && (
                <div className={`p-4 rounded-lg ${
                  importStatus.includes('Error') || importStatus.includes('failed')
                    ? 'bg-red-50 text-red-800'
                    : 'bg-green-50 text-green-800'
                }`}>
                  <pre className="text-sm whitespace-pre-wrap">{importStatus}</pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-6">
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search locations..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Search
                </button>
              </div>

              {searchResults && (
                <div className="space-y-4">
                  {searchResults.states.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">States ({searchResults.states.length})</h4>
                      <div className="space-y-1">
                        {searchResults.states.map((state: State) => (
                          <div key={state.id} className="p-2 bg-gray-50 rounded">
                            {state.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.districts.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Districts ({searchResults.districts.length})</h4>
                      <div className="space-y-1">
                        {searchResults.districts.map((district: District) => (
                          <div key={district.id} className="p-2 bg-gray-50 rounded">
                            {district.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.constituencies.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Constituencies ({searchResults.constituencies.length})</h4>
                      <div className="space-y-1">
                        {searchResults.constituencies.map((constituency: Constituency) => (
                          <div key={constituency.id} className="p-2 bg-gray-50 rounded">
                            {constituency.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.mandals.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Mandals ({searchResults.mandals.length})</h4>
                      <div className="space-y-1">
                        {searchResults.mandals.map((mandal: Mandal) => (
                          <div key={mandal.id} className="p-2 bg-gray-50 rounded">
                            {mandal.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {searchResults.villages.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Villages ({searchResults.villages.length})</h4>
                      <div className="space-y-1">
                        {searchResults.villages.map((village: Village) => (
                          <div key={village.id} className="p-2 bg-gray-50 rounded">
                            {village.name} {village.name_telugu && `(${village.name_telugu})`}
                            <span className="ml-2 text-xs text-gray-500">{village.area_category}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LocationBrowser() {
  const { states, loading } = useStates();
  const [expandedStates, setExpandedStates] = useState<Set<number>>(new Set());
  const [expandedDistricts, setExpandedDistricts] = useState<Set<number>>(new Set());
  const [expandedConstituencies, setExpandedConstituencies] = useState<Set<number>>(new Set());
  const [expandedMandals, setExpandedMandals] = useState<Set<number>>(new Set());

  const [districts, setDistricts] = useState<Record<number, District[]>>({});
  const [constituencies, setConstituencies] = useState<Record<number, Constituency[]>>({});
  const [mandals, setMandals] = useState<Record<number, Mandal[]>>({});
  const [villages, setVillages] = useState<Record<number, Village[]>>({});

  const toggleState = async (stateId: number) => {
    const newExpanded = new Set(expandedStates);
    if (newExpanded.has(stateId)) {
      newExpanded.delete(stateId);
    } else {
      newExpanded.add(stateId);
      if (!districts[stateId]) {
        const data = await locationApi.getDistrictsByState(stateId);
        setDistricts({ ...districts, [stateId]: data });
      }
    }
    setExpandedStates(newExpanded);
  };

  const toggleDistrict = async (districtId: number) => {
    const newExpanded = new Set(expandedDistricts);
    if (newExpanded.has(districtId)) {
      newExpanded.delete(districtId);
    } else {
      newExpanded.add(districtId);
      if (!constituencies[districtId]) {
        const data = await locationApi.getConstituenciesByDistrict(districtId);
        setConstituencies({ ...constituencies, [districtId]: data });
      }
    }
    setExpandedDistricts(newExpanded);
  };

  const toggleConstituency = async (constituencyId: number) => {
    const newExpanded = new Set(expandedConstituencies);
    if (newExpanded.has(constituencyId)) {
      newExpanded.delete(constituencyId);
    } else {
      newExpanded.add(constituencyId);
      if (!mandals[constituencyId]) {
        const data = await locationApi.getMandalsByConstituency(constituencyId);
        setMandals({ ...mandals, [constituencyId]: data });
      }
    }
    setExpandedConstituencies(newExpanded);
  };

  const toggleMandal = async (mandalId: number) => {
    const newExpanded = new Set(expandedMandals);
    if (newExpanded.has(mandalId)) {
      newExpanded.delete(mandalId);
    } else {
      newExpanded.add(mandalId);
      if (!villages[mandalId]) {
        const data = await locationApi.getVillagesByMandal(mandalId);
        setVillages({ ...villages, [mandalId]: data });
      }
    }
    setExpandedMandals(newExpanded);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading locations...</div>;
  }

  if (states.length === 0) {
    return (
      <div className="text-center py-8">
        <MapPin className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-gray-500">No location data available. Import data to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {states.map((state) => (
        <div key={state.id} className="border border-gray-200 rounded-lg">
          <button
            onClick={() => toggleState(state.id)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-2">
              {expandedStates.has(state.id) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <span className="font-medium text-gray-900">{state.name}</span>
            </div>
          </button>

          {expandedStates.has(state.id) && districts[state.id] && (
            <div className="pl-6 pb-2">
              {districts[state.id].map((district) => (
                <div key={district.id} className="border-l-2 border-gray-200 ml-2">
                  <button
                    onClick={() => toggleDistrict(district.id)}
                    className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-50"
                  >
                    {expandedDistricts.has(district.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <span className="text-gray-700">{district.name}</span>
                  </button>

                  {expandedDistricts.has(district.id) && constituencies[district.id] && (
                    <div className="pl-6">
                      {constituencies[district.id].map((constituency) => (
                        <div key={constituency.id} className="border-l-2 border-gray-200 ml-2">
                          <button
                            onClick={() => toggleConstituency(constituency.id)}
                            className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-50"
                          >
                            {expandedConstituencies.has(constituency.id) ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronRight className="w-3 h-3" />
                            )}
                            <span className="text-sm text-gray-600">{constituency.name}</span>
                          </button>

                          {expandedConstituencies.has(constituency.id) && mandals[constituency.id] && (
                            <div className="pl-6">
                              {mandals[constituency.id].map((mandal) => (
                                <div key={mandal.id} className="border-l-2 border-gray-200 ml-2">
                                  <button
                                    onClick={() => toggleMandal(mandal.id)}
                                    className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-50"
                                  >
                                    {expandedMandals.has(mandal.id) ? (
                                      <ChevronDown className="w-3 h-3" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3" />
                                    )}
                                    <span className="text-sm text-gray-500">{mandal.name}</span>
                                  </button>

                                  {expandedMandals.has(mandal.id) && villages[mandal.id] && (
                                    <div className="pl-6 pb-2">
                                      {villages[mandal.id].map((village) => (
                                        <div key={village.id} className="px-4 py-1 text-xs text-gray-500">
                                          {village.name} {village.name_telugu && `(${village.name_telugu})`}
                                          <span className="ml-2 text-gray-400">{village.area_category}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
