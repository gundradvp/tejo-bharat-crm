export interface StateSolarYieldInfo {
  state: string;
  dailyYieldPerKw: number; // kWh / kWp / day
  monthlyYieldPerKw: number; // kWh / kWp / month
  annualYieldPerKw: number; // kWh / kWp / year
  co2FactorKgPerKwh: number; // 0.82 kg CO2 / kWh
}

export const STATE_SOLAR_INSOLATION_MAP: Record<string, { daily: number; monthly: number; annual: number }> = {
  'Telangana': { daily: 4.3, monthly: 125, annual: 1500 },
  'Andhra Pradesh': { daily: 4.3, monthly: 125, annual: 1500 },
  'Rajasthan': { daily: 4.8, monthly: 144, annual: 1728 },
  'Gujarat': { daily: 4.7, monthly: 141, annual: 1692 },
  'Maharashtra': { daily: 4.4, monthly: 132, annual: 1584 },
  'Madhya Pradesh': { daily: 4.5, monthly: 135, annual: 1620 },
  'Karnataka': { daily: 4.3, monthly: 129, annual: 1548 },
  'Tamil Nadu': { daily: 4.4, monthly: 132, annual: 1584 },
  'Kerala': { daily: 4.0, monthly: 120, annual: 1440 },
  'Goa': { daily: 4.1, monthly: 123, annual: 1476 },
  'Delhi': { daily: 4.2, monthly: 126, annual: 1512 },
  'Haryana': { daily: 4.2, monthly: 126, annual: 1512 },
  'Punjab': { daily: 4.1, monthly: 123, annual: 1476 },
  'Uttar Pradesh': { daily: 4.1, monthly: 123, annual: 1476 },
  'West Bengal': { daily: 3.9, monthly: 117, annual: 1404 },
  'Odisha': { daily: 4.1, monthly: 123, annual: 1476 },
  'Bihar': { daily: 4.0, monthly: 120, annual: 1440 },
  'Jharkhand': { daily: 4.1, monthly: 123, annual: 1476 },
  'Assam': { daily: 3.6, monthly: 108, annual: 1296 },
  'Himachal Pradesh': { daily: 3.8, monthly: 114, annual: 1368 },
  'Jammu and Kashmir': { daily: 3.7, monthly: 111, annual: 1332 },
  'Puducherry': { daily: 4.4, monthly: 132, annual: 1584 },
};

export const ALL_INDIAN_STATES = Object.keys(STATE_SOLAR_INSOLATION_MAP);

export function calculateSolarYieldAndCO2(capacityKw: number, stateName: string = 'Telangana') {
  const cleanState = Object.keys(STATE_SOLAR_INSOLATION_MAP).find(s => 
    stateName.toLowerCase().includes(s.toLowerCase())
  ) || 'Telangana';

  const insolation = STATE_SOLAR_INSOLATION_MAP[cleanState];

  const dailyUnits = Math.round(capacityKw * insolation.daily * 10) / 10;
  const monthlyUnits = Math.round(capacityKw * insolation.monthly);
  const annualUnits = Math.round(capacityKw * insolation.annual);

  // CEA India Grid emission factor: 0.82 kg CO2 per kWh
  const annualCo2OffsetTonnes = Number(((annualUnits * 0.82) / 1000).toFixed(2));
  const lifetimeCo2OffsetTonnes = Number((annualCo2OffsetTonnes * 25).toFixed(1));

  // 1 Tonne CO2 offset ≈ 45 trees planted over 25 yrs
  const annualTreesEquivalent = Math.round(annualCo2OffsetTonnes * 45);
  const lifetimeTreesEquivalent = annualTreesEquivalent * 25;

  return {
    state: cleanState,
    dailyUnits,
    monthlyUnits,
    annualUnits,
    annualCo2OffsetTonnes,
    lifetimeCo2OffsetTonnes,
    annualTreesEquivalent,
    lifetimeTreesEquivalent,
  };
}
