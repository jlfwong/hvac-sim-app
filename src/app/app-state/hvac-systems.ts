import { atom } from "jotai";
import {
  DualFuelTwoStageHVACSystem,
  SimpleHVACSystem,
} from "../../lib/hvac-system";
import {
  auxSwitchoverTempFAtom,
  coolingSetPointFAtom,
  heatingSetPointFAtom,
} from "./config";
import {
  gasFurnaceAtom,
  acAtom,
  electricFurnaceAtom,
  heatpumpAtom,
} from "./equipment";
import { HVACSystem } from "../../lib/types";

export const gasFurnaceSystemAtom = atom<HVACSystem | null>((get) => {
  const gasFurnace = get(gasFurnaceAtom);
  const ac = get(acAtom);

  if (!gasFurnace || !ac) return null;

  return new SimpleHVACSystem(`${gasFurnace.name} + ${ac.name}`, {
    coolingSetPointF: get(coolingSetPointFAtom),
    coolingAppliance: ac,

    heatingSetPointF: get(heatingSetPointFAtom),
    heatingAppliance: gasFurnace,
  });
});

export const electricFurnaceSystemAtom = atom<HVACSystem | null>((get) => {
  const electricFurnace = get(electricFurnaceAtom);
  const ac = get(acAtom);

  if (!electricFurnace || !ac) return null;

  return new SimpleHVACSystem(`${electricFurnace.name} + ${ac.name}`, {
    coolingSetPointF: get(coolingSetPointFAtom),
    coolingAppliance: ac,

    heatingSetPointF: get(heatingSetPointFAtom),
    heatingAppliance: electricFurnace,
  });
});

export const dualFuelSystemAtom = atom<HVACSystem | null>((get) => {
  const heatpump = get(heatpumpAtom);
  const gasFurnace = get(gasFurnaceAtom);

  if (!heatpump || !gasFurnace) return null;

  return new DualFuelTwoStageHVACSystem(
    `Dual Fuel Two Stage (${heatpump.name} + ${gasFurnace.name})`,
    {
      coolingSetPointF: get(coolingSetPointFAtom),
      coolingAppliance: heatpump,

      heatingSetPointF: get(heatingSetPointFAtom),
      heatingAppliance: heatpump,

      auxSwitchoverTempF: get(auxSwitchoverTempFAtom),
      auxHeatingAppliance: gasFurnace,

      // Like the "Compressor Stage 1 Max Runtime" setting in
      // ecobee
      stage1MaxDurationMinutes: 120,

      // Like the "Compressor Stage 2 Temperature Delta" setting
      // in ecobee
      stage2TemperatureDeltaF: 1,
    }
  );
});

export const systemsToSimulate = atom<HVACSystem[] | null>((get) => {
  const dualFuelSystem = get(dualFuelSystemAtom);
  const gasFurnaceSystem = get(gasFurnaceSystemAtom);
  const electricFurnaceSystem = get(electricFurnaceSystemAtom);

  if (!dualFuelSystem || !gasFurnaceSystem || !electricFurnaceSystem) {
    return null;
  }

  return [dualFuelSystem, gasFurnaceSystem, electricFurnaceSystem];
});
