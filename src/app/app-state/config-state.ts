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

export const floorSpaceSqFtAtom = atom<number | null>(null);

export const postalCodeAtom = atom<string | null>(null);

export const statusQuoFurnaceFuelAtom = atom<"electric" | "gas">("gas");

export const heatpumpBackupFuelAtom = atom<"electric" | "gas">("electric");

export const heatpumpInstallCostAtom = atom<number>(17000);

export const gasFurnaceInstallCostAtom = atom<number>(6500);

export const airConditionerInstallCostAtom = atom<number>(6000);

export const electricFurnaceInstallCostAtom = atom<number>(6000);

export const hasOtherGasAppliancesAtom = atom<boolean>(true);

export const welcomeFormHasBeenSubmitAtom = atom<boolean>(false);