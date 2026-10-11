import React, { useState } from 'react';
import { X, Zap, Battery, Sun, Cpu, Calculator, Plus, CheckCircle2, Sliders, Clock } from 'lucide-react';
import { LineItem } from '../types/quotation';

export interface OffGridCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyOffGridQuote: (data: {
    systemCapacityKw: number;
    totalAmount: number;
    category: string;
    lineItems: LineItem[];
    ratePerKw: number;
    description: string;
  }) => void;
}

export interface ApplianceItem {
  id: string;
  name: string;
  defaultWattage: number;
  wattage: number;
  qty: number;
  backupHours: number;
  enabled: boolean;
  icon?: string;
}

const DEFAULT_APPLIANCES: ApplianceItem[] = [
  { id: 'fan-std', name: 'Ceiling Fan (Standard AC)', defaultWattage: 75, wattage: 75, qty: 2, backupHours: 8, enabled: true },
  { id: 'fan-bldc', name: 'BLDC Energy Saving Fan', defaultWattage: 30, wattage: 30, qty: 0, backupHours: 8, enabled: false },
  { id: 'led-light', name: 'LED Light (Bulb/Tube)', defaultWattage: 18, wattage: 18, qty: 4, backupHours: 5, enabled: true },
  { id: 'tv-led', name: 'LED TV (32" - 55")', defaultWattage: 80, wattage: 80, qty: 1, backupHours: 4, enabled: false },
  { id: 'fridge-180', name: 'Refrigerator (Single Door)', defaultWattage: 150, wattage: 150, qty: 0, backupHours: 12, enabled: false },
  { id: 'fridge-250', name: 'Refrigerator (Double Door)', defaultWattage: 250, wattage: 250, qty: 0, backupHours: 12, enabled: false },
  { id: 'motor-05hp', name: 'Water Motor / Pump (0.5 HP)', defaultWattage: 375, wattage: 375, qty: 0, backupHours: 1, enabled: false },
  { id: 'motor-1hp', name: 'Water Motor / Pump (1.0 HP)', defaultWattage: 750, wattage: 750, qty: 0, backupHours: 1, enabled: false },
  { id: 'ac-1ton', name: '1.0 Ton Inverter AC', defaultWattage: 1200, wattage: 1200, qty: 0, backupHours: 4, enabled: false },
  { id: 'pc-laptop', name: 'Desktop Computer / Laptop', defaultWattage: 100, wattage: 100, qty: 0, backupHours: 4, enabled: false },
  { id: 'wifi-cctv', name: 'Wi-Fi Router & CCTV System', defaultWattage: 30, wattage: 30, qty: 0, backupHours: 12, enabled: false },
];

export const OffGridCalculatorModal: React.FC<OffGridCalculatorModalProps> = ({
  isOpen,
  onClose,
  onApplyOffGridQuote,
}) => {
  const [appliances, setAppliances] = useState<ApplianceItem[]>(DEFAULT_APPLIANCES);
  const [batteryType, setBatteryType] = useState<'lithium' | 'tubular'>('lithium');
  const [customName, setCustomName] = useState<string>('');
  const [customWattage, setCustomWattage] = useState<number>(100);
  const [customQty, setCustomQty] = useState<number>(1);
  const [customBackupHours, setCustomBackupHours] = useState<number>(4);
  const [bundleSingleItem, setBundleSingleItem] = useState<boolean>(true);

  // Editable pricing overrides
  const [overrideTotalCost, setOverrideTotalCost] = useState<number | null>(null);
  const [customPanelsCost, setCustomPanelsCost] = useState<number | null>(null);
  const [customInverterCost, setCustomInverterCost] = useState<number | null>(null);
  const [customBatteryCost, setCustomBatteryCost] = useState<number | null>(null);
  const [customBOSCost, setCustomBOSCost] = useState<number | null>(null);
  const [customInstallCost, setCustomInstallCost] = useState<number | null>(null);

  if (!isOpen) return null;

  // 1. Calculate Active Load & Energy Requirements
  const activeAppliances = appliances.filter((a) => a.enabled && a.qty > 0);
  const totalRunningLoadW = activeAppliances.reduce((sum, a) => sum + a.wattage * a.qty, 0);

  // 2. Daily Energy Output (Wh) per individual appliance requirements
  const totalDailyEnergyWh = activeAppliances.reduce(
    (sum, a) => sum + a.wattage * a.qty * a.backupHours,
    0
  );
  const totalDailyEnergyKwh = totalDailyEnergyWh / 1000;

  // Maximum & weighted average backup hours for general spec display
  const maxBackupHours = activeAppliances.length > 0
    ? Math.max(...activeAppliances.map((a) => a.backupHours))
    : 8;
  const avgBackupHours = totalRunningLoadW > 0
    ? Math.round((totalDailyEnergyWh / totalRunningLoadW) * 10) / 10
    : 8;

  // 3. Inverter Sizing
  // Add safety surge margin of 30%
  const inverterWattageNeeded = totalRunningLoadW * 1.3;
  let inverterKva = 1.0;
  let systemVoltage = 12;

  if (inverterWattageNeeded <= 800) {
    inverterKva = 1.0;
    systemVoltage = 12;
  } else if (inverterWattageNeeded <= 1400) {
    inverterKva = 1.5;
    systemVoltage = 24;
  } else if (inverterWattageNeeded <= 2500) {
    inverterKva = 3.0;
    systemVoltage = 48;
  } else if (inverterWattageNeeded <= 4500) {
    inverterKva = 5.0;
    systemVoltage = 48;
  } else if (inverterWattageNeeded <= 8000) {
    inverterKva = 7.5;
    systemVoltage = 48;
  } else {
    inverterKva = Math.ceil((inverterWattageNeeded / 1000) * 1.25);
    systemVoltage = 48;
  }

  // 4. Battery Sizing
  // Efficiency: Inverter 85%, Lithium DoD 80% (effective 0.68), Tubular DoD 70% (effective 0.595)
  const eff = batteryType === 'lithium' ? 0.85 * 0.8 : 0.85 * 0.7;
  const requiredGrossEnergyWh = totalDailyEnergyWh > 0 ? totalDailyEnergyWh / eff : 2000;
  const requiredBatteryKwh = Math.round((requiredGrossEnergyWh / 1000) * 100) / 100;

  // Battery Quantity calculation
  let batteryDescriptionText = '';
  let estimatedBatteryPrice = 0;

  if (batteryType === 'lithium') {
    // 25.6V 100Ah = 2.56 kWh packs or 51.2V 100Ah = 5.12 kWh packs
    if (systemVoltage === 48 || requiredBatteryKwh > 4) {
      const packs = Math.max(1, Math.round(requiredBatteryKwh / 5.12));
      batteryDescriptionText = `${packs} × 51.2V 100Ah (${packs * 5.12} kWh) LiFePO4 Smart BMS Battery Pack`;
      estimatedBatteryPrice = packs * 95000;
    } else {
      const packs = Math.max(1, Math.round(requiredBatteryKwh / 2.56));
      batteryDescriptionText = `${packs} × 25.6V 100Ah (${packs * 2.56} kWh) LiFePO4 Smart BMS Battery Pack`;
      estimatedBatteryPrice = packs * 48000;
    }
  } else {
    // Tubular 12V 150Ah = 1.8 kWh gross per battery
    const batteryCount = Math.max(
      systemVoltage / 12,
      Math.ceil(requiredGrossEnergyWh / (12 * 150))
    );
    const seriesUnits = systemVoltage / 12;
    const finalTubularCount = Math.ceil(batteryCount / seriesUnits) * seriesUnits;
    batteryDescriptionText = `${finalTubularCount} × 12V 150Ah C10 Tall Tubular Solar Batteries (${systemVoltage}V Bank)`;
    estimatedBatteryPrice = finalTubularCount * 15000;
  }

  // 5. Solar PV Panel Array Sizing
  // Daily generation needed = daily load energy * 1.25 charging loss
  const solarEnergyNeededWh = totalDailyEnergyWh * 1.25;
  const peakSunHours = 4.5; // Average Indian solar insolation
  const rawSolarKw = solarEnergyNeededWh / (peakSunHours * 1000);
  const roundedSolarKw = Math.max(0.5, Math.round(rawSolarKw * 2) / 2); // Round to nearest 0.5 kW
  const panelWattage = 550;
  const panelsCount = Math.max(2, Math.ceil((roundedSolarKw * 1000) / panelWattage));
  const actualSolarKw = Math.round(((panelsCount * panelWattage) / 1000) * 100) / 100;

  // 6. Base Estimated Costs
  const basePanelsCost = customPanelsCost !== null ? customPanelsCost : Math.round(actualSolarKw * 1000 * 22);
  const baseInverterCost = customInverterCost !== null ? customInverterCost : Math.round(inverterKva * 12500);
  const baseBatteryCost = customBatteryCost !== null ? customBatteryCost : estimatedBatteryPrice;
  const baseBOSCost = customBOSCost !== null ? customBOSCost : 14500;
  const baseInstallCost = customInstallCost !== null ? customInstallCost : 8500;

  const calculatedTotalCost = basePanelsCost + baseInverterCost + baseBatteryCost + baseBOSCost + baseInstallCost;
  const finalTotalCost = overrideTotalCost !== null ? overrideTotalCost : calculatedTotalCost;

  // Handlers for Appliance list
  const handleToggleAppliance = (id: string) => {
    setAppliances((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const handleQtyChange = (id: string, delta: number) => {
    setAppliances((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const newQty = Math.max(0, a.qty + delta);
          return { ...a, qty: newQty, enabled: newQty > 0 ? true : a.enabled };
        }
        return a;
      })
    );
  };

  const handleWattageChange = (id: string, val: number) => {
    setAppliances((prev) =>
      prev.map((a) => (a.id === id ? { ...a, wattage: Math.max(1, val) } : a))
    );
  };

  const handleBackupHoursChange = (id: string, val: number) => {
    setAppliances((prev) =>
      prev.map((a) => (a.id === id ? { ...a, backupHours: Math.min(24, Math.max(1, val)) } : a))
    );
  };

  const handleAddCustomAppliance = () => {
    if (!customName.trim()) return;
    const newItem: ApplianceItem = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      defaultWattage: customWattage,
      wattage: customWattage,
      qty: Math.max(1, customQty),
      backupHours: Math.max(1, customBackupHours),
      enabled: true,
    };
    setAppliances((prev) => [...prev, newItem]);
    setCustomName('');
    setCustomWattage(100);
    setCustomQty(1);
    setCustomBackupHours(4);
  };

  const handleRemoveCustom = (id: string) => {
    setAppliances((prev) => prev.filter((a) => a.id !== id));
  };

  // Generate Summary Description for quotation with per-appliance backup breakdown
  const loadSummaryList = activeAppliances
    .map((a) => `${a.qty}× ${a.name} (${a.wattage}W, ${a.backupHours}h backup)`)
    .join('; ');

  const systemSpecDescription = `${actualSolarKw} kWp Solar PV Panel Array (${panelsCount}× 550W Modules), ${inverterKva} kVA / ${systemVoltage}V MPPT Solar Hybrid Inverter, ${batteryDescriptionText}. Configured Appliance Backup Breakdown: [${loadSummaryList || 'Essential Appliances'}]. Total Daily Energy Requirement: ${totalDailyEnergyKwh.toFixed(2)} kWh. Incl. HDG Roof Structure, DC/AC BOS, Cables, Earthing & Turnkey Installation.`;

  const handleApply = () => {
    const ratePerKw = actualSolarKw > 0 ? Math.round(finalTotalCost / actualSolarKw) : 60000;
    const taxRate = 8.9;
    const taxableTotal = finalTotalCost / (1 + taxRate / 100);
    const taxAmount = Math.round((finalTotalCost - taxableTotal) * 100) / 100;
    const pricePerKw = Math.round((taxableTotal / actualSolarKw) * 100) / 100;

    let generatedLineItems: LineItem[] = [];

    if (bundleSingleItem) {
      generatedLineItems = [
        {
          id: `offgrid-pkg-${Date.now()}`,
          name: `${actualSolarKw} kWp Off-Grid Solar Power System (Custom Load Backup Package)`,
          description: systemSpecDescription,
          hsn_code: '85414011',
          qty: actualSolarKw,
          unit: 'kW',
          price_per_item: pricePerKw,
          discount_rs: 0,
          discount_percent: 0,
          tax_rate_percent: taxRate,
          tax_amount: taxAmount,
          total_amount: finalTotalCost,
        },
      ];
    } else {
      // Detailed line items breakdown
      const panelsTax = Math.round((basePanelsCost - basePanelsCost / 1.089) * 100) / 100;
      const inverterTax = Math.round((baseInverterCost - baseInverterCost / 1.089) * 100) / 100;
      const batteryTax = Math.round((baseBatteryCost - baseBatteryCost / 1.089) * 100) / 100;
      const bosTax = Math.round((baseBOSCost - baseBOSCost / 1.089) * 100) / 100;
      const installTax = Math.round((baseInstallCost - baseInstallCost / 1.089) * 100) / 100;

      generatedLineItems = [
        {
          id: `offgrid-item-pv-${Date.now()}`,
          name: `${actualSolarKw} kWp High-Efficiency Solar PV Modules`,
          description: `${panelsCount} × 550W Mono PERC / TOPCon Half-Cut PV Panels (BIS Certified)`,
          hsn_code: '85414011',
          qty: panelsCount,
          unit: 'Pcs',
          price_per_item: Math.round(((basePanelsCost - panelsTax) / panelsCount) * 100) / 100,
          tax_rate_percent: 8.9,
          tax_amount: panelsTax,
          total_amount: basePanelsCost,
        },
        {
          id: `offgrid-item-inv-${Date.now()}`,
          name: `${inverterKva} kVA / ${systemVoltage}V MPPT Solar Hybrid Inverter`,
          description: `Pure Sine Wave Output, Heavy-Duty Dual Load Export & Battery Solar Charger`,
          hsn_code: '85044090',
          qty: 1,
          unit: 'Set',
          price_per_item: Math.round((baseInverterCost - inverterTax) * 100) / 100,
          tax_rate_percent: 8.9,
          tax_amount: inverterTax,
          total_amount: baseInverterCost,
        },
        {
          id: `offgrid-item-bat-${Date.now()}`,
          name: `${batteryType === 'lithium' ? 'LiFePO4 Lithium' : 'C10 Tall Tubular'} Solar Battery Bank`,
          description: `${batteryDescriptionText} (Sized for ${totalDailyEnergyKwh.toFixed(2)} kWh Daily Backup Energy)`,
          hsn_code: '85072000',
          qty: 1,
          unit: 'Set',
          price_per_item: Math.round((baseBatteryCost - batteryTax) * 100) / 100,
          tax_rate_percent: 8.9,
          tax_amount: batteryTax,
          total_amount: baseBatteryCost,
        },
        {
          id: `offgrid-item-bos-${Date.now()}`,
          name: `Roof Structure, DC/AC Cables, Earthing & BOS Kit`,
          description: `Hot-Dip Galvanized Mounting Structure, UV DC Cables, MC4, DCDB/ACDB, Lightning Arrester`,
          hsn_code: '73089090',
          qty: 1,
          unit: 'Set',
          price_per_item: Math.round((baseBOSCost - bosTax) * 100) / 100,
          tax_rate_percent: 8.9,
          tax_amount: bosTax,
          total_amount: baseBOSCost,
        },
        {
          id: `offgrid-item-inst-${Date.now()}`,
          name: `Turnkey Installation, Testing & Transportation`,
          description: `On-site mounting, electrical cabling, inverter-battery commissioning & testing`,
          hsn_code: '998731',
          qty: 1,
          unit: 'Job',
          price_per_item: Math.round((baseInstallCost - installTax) * 100) / 100,
          tax_rate_percent: 8.9,
          tax_amount: installTax,
          total_amount: baseInstallCost,
        },
      ];
    }

    onApplyOffGridQuote({
      systemCapacityKw: actualSolarKw,
      totalAmount: finalTotalCost,
      category: 'Off-Grid Solar System',
      lineItems: generatedLineItems,
      ratePerKw,
      description: systemSpecDescription,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-teal-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400/20 text-amber-400 rounded-xl border border-amber-400/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Off-Grid Solar Calculator & Load Designer
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-400 text-slate-950 rounded-full">Per-Appliance Backup</span>
              </h2>
              <p className="text-xs text-teal-200">
                Configure wattage, quantity, and required backup hours for EACH individual appliance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 font-sans">
          
          {/* STEP 1: APPLIANCE LOAD & INDIVIDUAL BACKUP CALCULATOR */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-teal-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">1. Appliances, Power & Individual Backup Hours</h3>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <div className="px-3 py-1 bg-slate-100 border border-slate-300 text-slate-800 rounded-lg">
                  Running Load: <span className="text-teal-700 font-bold">{totalRunningLoadW} Watts</span>
                </div>
                <div className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg">
                  Daily Energy: <span className="text-amber-700 font-bold">{totalDailyEnergyKwh.toFixed(2)} kWh</span>
                </div>
              </div>
            </div>

            {/* APPLIANCES GRID TABLE */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {appliances.map((app) => {
                const applianceWh = app.wattage * app.qty * app.backupHours;
                return (
                  <div
                    key={app.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap ${
                      app.enabled && app.qty > 0
                        ? 'bg-teal-50/30 border-teal-300 shadow-xs'
                        : 'bg-slate-50 border-slate-200 opacity-70'
                    }`}
                  >
                    {/* CHECKBOX & NAME */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                      <input
                        type="checkbox"
                        checked={app.enabled}
                        onChange={() => handleToggleAppliance(app.id)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate">{app.name}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                          <span>Default: {app.defaultWattage}W</span>
                          {app.enabled && app.qty > 0 && (
                            <span className="font-mono font-bold text-teal-700 bg-teal-100/80 px-1.5 py-0.5 rounded text-[9.5px]">
                              {applianceWh >= 1000 ? `${(applianceWh / 1000).toFixed(2)} kWh` : `${applianceWh} Wh`}
                            </span>
                          )}
                          {app.id.startsWith('custom-') && (
                            <button
                              onClick={() => handleRemoveCustom(app.id)}
                              className="text-red-500 hover:text-red-700 ml-1 font-bold"
                            >
                              (Remove)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CONTROLS: QTY, WATTAGE & BACKUP HOURS */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      
                      {/* QTY */}
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase">Qty</span>
                        <div className="flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden text-xs">
                          <button
                            onClick={() => handleQtyChange(app.id, -1)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                          >
                            -
                          </button>
                          <span className="px-2 font-mono font-bold text-slate-900">{app.qty}</span>
                          <button
                            onClick={() => handleQtyChange(app.id, 1)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* WATTAGE PER ITEM */}
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase">Wattage</span>
                        <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-0.5 w-20">
                          <input
                            type="number"
                            min="1"
                            value={app.wattage}
                            onChange={(e) => handleWattageChange(app.id, Number(e.target.value))}
                            className="w-full text-xs font-mono font-bold text-slate-800 bg-transparent focus:outline-none text-right"
                          />
                          <span className="text-[10px] font-bold text-slate-400 ml-0.5">W</span>
                        </div>
                      </div>

                      {/* BACKUP HOURS PER APPLIANCE */}
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-extrabold text-amber-600 uppercase flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" /> Backup
                        </span>
                        <div className="flex items-center bg-amber-50 border border-amber-300 rounded-lg px-2 py-0.5 w-20">
                          <input
                            type="number"
                            min="1"
                            max="24"
                            value={app.backupHours}
                            onChange={(e) => handleBackupHoursChange(app.id, Number(e.target.value))}
                            className="w-full text-xs font-mono font-extrabold text-amber-900 bg-transparent focus:outline-none text-right"
                          />
                          <span className="text-[10px] font-bold text-amber-700 ml-0.5">Hrs</span>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>

            {/* ADD CUSTOM APPLIANCE ROW */}
            <div className="pt-3 border-t flex items-center gap-2.5 flex-wrap bg-slate-50 p-3 rounded-xl">
              <span className="text-xs font-bold text-slate-700">Add Custom Appliance:</span>
              <input
                type="text"
                placeholder="Appliance Name (e.g. Grinder / Oven)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg flex-1 min-w-[140px]"
              />
              <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1 w-20">
                <input
                  type="number"
                  placeholder="Watts"
                  value={customWattage}
                  onChange={(e) => setCustomWattage(Number(e.target.value))}
                  className="w-full text-xs font-mono text-slate-800 focus:outline-none text-right"
                />
                <span className="text-[10px] text-slate-400 ml-0.5">W</span>
              </div>
              <div className="flex items-center bg-amber-50 border border-amber-300 rounded-lg px-2 py-1 w-20">
                <input
                  type="number"
                  placeholder="Hours"
                  min="1"
                  max="24"
                  value={customBackupHours}
                  onChange={(e) => setCustomBackupHours(Number(e.target.value))}
                  className="w-full text-xs font-mono font-bold text-amber-900 focus:outline-none text-right"
                />
                <span className="text-[10px] text-amber-700 ml-0.5">Hrs</span>
              </div>
              <button
                onClick={handleAddCustomAppliance}
                className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          {/* STEP 2: BATTERY CHEMISTRY */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <label className="text-xs font-extrabold text-slate-900 block border-b pb-2">
              Select Battery Chemistry / Storage Technology
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setBatteryType('lithium')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  batteryType === 'lithium'
                    ? 'bg-teal-900 text-white border-teal-800 ring-2 ring-teal-500 shadow-md'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-black flex items-center justify-between">
                  <span>Lithium LiFePO4 Battery</span>
                  <span className="text-[9px] px-2 py-0.5 bg-emerald-400 text-slate-950 font-extrabold rounded">10-15 Yrs Life</span>
                </div>
                <div className="text-[10px] opacity-80 mt-1">Smart BMS, Wall/Floor Mount, 95% Efficiency, Fast Charging</div>
              </button>

              <button
                onClick={() => setBatteryType('tubular')}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  batteryType === 'tubular'
                    ? 'bg-teal-900 text-white border-teal-800 ring-2 ring-teal-500 shadow-md'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="text-xs font-black flex items-center justify-between">
                  <span>Tall Tubular C10 Batteries</span>
                  <span className="text-[9px] px-2 py-0.5 bg-amber-400 text-slate-950 font-extrabold rounded">3-5 Yrs Life</span>
                </div>
                <div className="text-[10px] opacity-80 mt-1">12V 150Ah Deep Cycle Solar Batteries, Budget Friendly</div>
              </button>
            </div>
          </div>

          {/* STEP 3: AUTO-GENERATED TECHNICAL DESIGN */}
          <div className="bg-gradient-to-r from-slate-900 to-teal-950 text-white p-5 rounded-xl border border-teal-800/80 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-teal-800/60 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm tracking-wide text-white uppercase">
                  Recommended System Technical Architecture
                </h3>
              </div>
              <span className="text-xs font-extrabold text-amber-300 font-mono">
                Total Daily Load Energy: {totalDailyEnergyKwh.toFixed(2)} kWh
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* INVERTER SIZING */}
              <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700">
                <div className="text-[11px] font-bold text-teal-300 flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5" />
                  Solar Inverter
                </div>
                <div className="text-lg font-black text-white">{inverterKva} kVA / {systemVoltage}V</div>
                <div className="text-[11px] text-slate-300 font-medium">Pure Sine Wave MPPT Off-Grid Hybrid</div>
              </div>

              {/* BATTERY SIZING */}
              <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700">
                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5 mb-1">
                  <Battery className="w-3.5 h-3.5" />
                  Battery Storage Bank
                </div>
                <div className="text-lg font-black text-white">{requiredBatteryKwh} kWh Usable</div>
                <div className="text-[11px] text-amber-200 font-medium leading-tight">{batteryDescriptionText}</div>
              </div>

              {/* SOLAR PANELS */}
              <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700">
                <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 mb-1">
                  <Sun className="w-3.5 h-3.5" />
                  Solar PV Capacity
                </div>
                <div className="text-lg font-black text-white">{actualSolarKw} kWp Solar Array</div>
                <div className="text-[11px] text-slate-300 font-medium">{panelsCount} × 550W Mono PERC / TOPCon Modules</div>
              </div>
            </div>
          </div>

          {/* STEP 4: EDITABLE COMMERCIAL COSTING */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">4. Commercial Pricing & Turnkey Costing</h3>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bundleSingleItem}
                  onChange={(e) => setBundleSingleItem(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Bundle as Single Package Line Item</span>
              </label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 block mb-1">Solar PV Panels (₹)</label>
                <input
                  type="number"
                  value={basePanelsCost}
                  onChange={(e) => setCustomPanelsCost(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-500 block mb-1">MPPT Inverter (₹)</label>
                <input
                  type="number"
                  value={baseInverterCost}
                  onChange={(e) => setCustomInverterCost(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-500 block mb-1">Battery Storage (₹)</label>
                <input
                  type="number"
                  value={baseBatteryCost}
                  onChange={(e) => setCustomBatteryCost(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-500 block mb-1">Structure & BOS (₹)</label>
                <input
                  type="number"
                  value={baseBOSCost}
                  onChange={(e) => setCustomBOSCost(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-500 block mb-1">Installation & Transport (₹)</label>
                <input
                  type="number"
                  value={baseInstallCost}
                  onChange={(e) => setCustomInstallCost(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            {/* TOTAL COST HIGHLIGHT & OVERRIDE */}
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs font-extrabold text-teal-900">Total Turnkey Off-Grid Package Cost</div>
                <div className="text-[11px] text-teal-700 font-medium">Includes 12%/18% GST, Turnkey BOS & 1-Year Service Warranty</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-600">Total Amount: ₹</span>
                <input
                  type="number"
                  value={finalTotalCost}
                  onChange={(e) => setOverrideTotalCost(Number(e.target.value))}
                  className="w-36 px-3 py-1.5 text-lg font-mono font-black bg-white border-2 border-teal-600 rounded-xl text-teal-950 focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </div>
          </div>

        </div>

        {/* FOOTER ACTIONS */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            className="px-6 py-2.5 bg-gradient-to-r from-teal-700 to-teal-900 hover:from-teal-800 hover:to-teal-950 text-white rounded-xl text-xs font-black shadow-lg hover:shadow-teal-900/20 flex items-center gap-2 transition-all"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>Apply & Generate Quotation ({actualSolarKw} kWp - ₹{finalTotalCost.toLocaleString('en-IN')})</span>
          </button>
        </div>

      </div>
    </div>
  );
};
