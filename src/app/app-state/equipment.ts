import { atom } from "jotai";
import { AirConditioner } from "../../lib/air-conditioner";
import { ElectricFurnace } from "../../lib/electric-furnace";
import { GasFurnace } from "../../lib/gas-furnace";
import { elevationFeetAtom } from "./canadian-weather";
import { AirSourceHeatPump } from "../../lib/heatpump";
import { selectedHeatpumpsAtom } from "./select-heatpump";

export const acAtom = atom<AirConditioner | null>((get) => {
  const elevationFeet = get(elevationFeetAtom);
  if (!elevationFeet) return null;

  // TODO(jlfwong): Configurable ac & seer capacity
  return new AirConditioner({
    seer: 11,
    capacityBtusPerHour: 40000,
    elevationFeet,
    speedSettings: "single-speed",
  });
});

export const gasFurnaceAtom = atom<GasFurnace | null>((get) => {
  const elevationFeet = get(elevationFeetAtom);
  if (elevationFeet == null) return null;

  // TODO(jlfwong): Configurable furnace capacity
  return new GasFurnace({
    afuePercent: 96,
    capacityBtusPerHour: 80000,
    elevationFeet,
  });
});

export const electricFurnaceAtom = atom<ElectricFurnace | null>((get) => {
  return new ElectricFurnace({
    capacityKw: 20,
  });
});

export const heatpumpAtom = atom<AirSourceHeatPump | null>((get) => {
  const candidates = get(selectedHeatpumpsAtom);
  if (candidates == null) return null;
  return candidates[0].heatpump;
});
