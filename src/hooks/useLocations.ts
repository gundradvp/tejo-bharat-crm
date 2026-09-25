import { useState, useEffect } from 'react';
import { locationApi, State, District, Constituency, Mandal, Village } from '../lib/locationApi';

export function useStates() {
  const [states, setStates] = useState<State[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStates();
  }, []);

  const loadStates = async () => {
    try {
      setLoading(true);
      const data = await locationApi.getStates();
      setStates(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { states, loading, error, reload: loadStates };
}

export function useDistricts(stateId?: number) {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stateId) {
      loadDistricts();
    } else {
      setDistricts([]);
    }
  }, [stateId]);

  const loadDistricts = async () => {
    if (!stateId) return;

    try {
      setLoading(true);
      const data = await locationApi.getDistrictsByState(stateId);
      setDistricts(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { districts, loading, error, reload: loadDistricts };
}

export function useConstituencies(districtId?: number) {
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (districtId) {
      loadConstituencies();
    } else {
      setConstituencies([]);
    }
  }, [districtId]);

  const loadConstituencies = async () => {
    if (!districtId) return;

    try {
      setLoading(true);
      const data = await locationApi.getConstituenciesByDistrict(districtId);
      setConstituencies(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { constituencies, loading, error, reload: loadConstituencies };
}

export function useMandals(constituencyId?: number) {
  const [mandals, setMandals] = useState<Mandal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (constituencyId) {
      loadMandals();
    } else {
      setMandals([]);
    }
  }, [constituencyId]);

  const loadMandals = async () => {
    if (!constituencyId) return;

    try {
      setLoading(true);
      const data = await locationApi.getMandalsByConstituency(constituencyId);
      setMandals(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { mandals, loading, error, reload: loadMandals };
}

export function useVillages(mandalId?: number) {
  const [villages, setVillages] = useState<Village[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mandalId) {
      loadVillages();
    } else {
      setVillages([]);
    }
  }, [mandalId]);

  const loadVillages = async () => {
    if (!mandalId) return;

    try {
      setLoading(true);
      const data = await locationApi.getVillagesByMandal(mandalId);
      setVillages(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { villages, loading, error, reload: loadVillages };
}

export function useLocationHierarchy(villageId?: number) {
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (villageId) {
      loadHierarchy();
    } else {
      setHierarchy(null);
    }
  }, [villageId]);

  const loadHierarchy = async () => {
    if (!villageId) return;

    try {
      setLoading(true);
      const data = await locationApi.getLocationHierarchy(villageId);
      setHierarchy(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { hierarchy, loading, error, reload: loadHierarchy };
}
