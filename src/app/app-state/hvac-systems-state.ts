import { atom } from "jotai";
import {
  TwoStageHeatPumpWithAuxHeating,
  SimpleHVACSystem,
} from "../../lib/hvac-system";
import {
  auxSwitchoverTempFAtom,
  coolingSetPointFAtom,
  heatingSetPointFAtom,
} from "./config-state";
import {
  gasFurnaceAtom,
  airConditionerAtom,
  electricFurnaceAtom,
} from "./equipment-state";
import { HVACSystem } from "../../lib/types";
import { selectedHeatpumpsAtom } from "./selected-heatpumps-state";
import type { DateTime } from "luxon";

export const gasFurnaceSystemAtom = atom<HVACSystem | null>((get) => {
  const gasFurnace = get(gasFurnaceAtom);
  const ac = get(airConditionerAtom);

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
  const ac = get(airConditionerAtom);

  if (!electricFurnace || !ac) return null;

  return new SimpleHVACSystem(`${electricFurnace.name} + ${ac.name}`, {
    coolingSetPointF: get(coolingSetPointFAtom),
    coolingAppliance: ac,

    heatingSetPointF: get(heatingSetPointFAtom),
    heatingAppliance: electricFurnace,
  });
});

export const dualFuelSystemAtom = atom<HVACSystem[] | null>((get) => {
  const candidates = get(selectedHeatpumpsAtom);
  const gasFurnace = get(gasFurnaceAtom);
  const auxSwitchoverTempF = get(auxSwitchoverTempFAtom);

  if (!candidates || !gasFurnace) return null;

  return candidates.map((c) => {
    const heatpump = c.heatpump;
    return new TwoStageHeatPumpWithAuxHeating(`Heat Pump (Gas Backup)`, {
      coolingSetPointF: get(coolingSetPointFAtom),
      coolingAppliance: heatpump,

      heatingSetPointF: get(heatingSetPointFAtom),
      heatingAppliance: heatpump,

      auxHeatingAppliance: gasFurnace,
      shouldEngageAuxHeating: (options: {
        localTime: DateTime;
        insideAirTempF: number;
        outsideAirTempF: number;
      }) => {
        return options.outsideAirTempF <= auxSwitchoverTempF;
      },

      // Like the "Compressor Stage 1 Max Runtime" setting in
      // ecobee
      stage1MaxDurationMinutes: 120,

      // Like the "Compressor Stage 2 Temperature Delta" setting
      // in ecobee
      stage2TemperatureDeltaF: 1,
    });
  });
});

export const heatPumpWithElectricBackupSystemAtom = atom<HVACSystem[] | null>(
  (get) => {
    const candidates = get(selectedHeatpumpsAtom);
    const electricFurnace = get(electricFurnaceAtom);
    const heatingSetPointF = get(heatingSetPointFAtom);

    if (!candidates || !electricFurnace) return null;

    return candidates.map((c) => {
      const heatpump = c.heatpump;
      return new TwoStageHeatPumpWithAuxHeating(`Heat Pump (Electric Backup)`, {
        coolingSetPointF: get(coolingSetPointFAtom),
        coolingAppliance: heatpump,

        heatingSetPointF: heatingSetPointF,
        heatingAppliance: heatpump,

        auxHeatingAppliance: electricFurnace,
        shouldEngageAuxHeating: (options: {
          localTime: DateTime;
          insideAirTempF: number;
          outsideAirTempF: number;
        }) => {
          // For electric backup, we only ever use the aux backup when
          // absolutely necessary, since it will always be more expensive than
          // running the heatpump.
          //
          // To detect this, we see if the inside air temp has drifted too far
          // below the target temperature. The value of 2.6F corresponds to the
          // "balanced" option for the ecobee with automatic staging.
          return options.insideAirTempF < heatingSetPointF - 2.6;
        },

        // Like the "Compressor Stage 1 Max Runtime" setting in
        // ecobee
        stage1MaxDurationMinutes: 120,

        // Like the "Compressor Stage 2 Temperature Delta" setting
        // in ecobee
        stage2TemperatureDeltaF: 1,
      });
    });
  }
);

export const systemsToSimulateAtom = atom<HVACSystem[] | null>((get) => {
  const dualFuelSystem = get(dualFuelSystemAtom);
  const gasFurnaceSystem = get(gasFurnaceSystemAtom);
  const heatPumpWithElectricBackupSystem = get(
    heatPumpWithElectricBackupSystemAtom
  );
  const electricFurnaceSystem = get(electricFurnaceSystemAtom);

  if (
    !dualFuelSystem ||
    !gasFurnaceSystem ||
    !electricFurnaceSystem ||
    !heatPumpWithElectricBackupSystem
  ) {
    return null;
  }

  // TODO(jlfwong): Add support for using electric furnace as reference, and for
  // selecting a gas backup instead of an electric backup.
  return heatPumpWithElectricBackupSystem
    .slice(0, 1)
    .concat([gasFurnaceSystem]);
});
