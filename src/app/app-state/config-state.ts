import { atom } from "jotai";
import { celciusToFahrenheit } from "../../lib/units";

export const heatingSetPointCAtom = atom(20);
export const coolingSetPointCAtom = atom(26);
export const auxSwitchoverTempCAtom = atom(-16);

export const heatingSetPointFAtom = atom((get) =>
  celciusToFahrenheit(get(heatingSetPointCAtom))
);
export const coolingSetPointFAtom = atom((get) =>
  celciusToFahrenheit(get(coolingSetPointCAtom))
);
export const auxSwitchoverTempFAtom = atom((get) =>
  celciusToFahrenheit(get(auxSwitchoverTempCAtom))
);

export const floorSpaceSqFtAtom = atom(2500);

export const postalCodeAtom = atom("M5V 0H8");

export const statusQuoFurnaceFuelAtom = atom<"electric" | "gas">("gas");

export const optimizeForAtom = atom<"cost" | "emissions">("emissions");

export const heatpumpInstallCostAtom = atom<number>(17000);

export const gasFurnaceInstallCostAtom = atom<number>(6500);

export const airConditionerInstallCostAtom = atom<number>(6000);

export const electricFurnaceInstallCostAtom = atom<number>(6000);