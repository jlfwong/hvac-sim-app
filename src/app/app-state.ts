import { atom } from "jotai";
import { BuildingGeometry } from "../lib/building-geometry";
import {
  type ThermalLoadSource,
  OccupantsLoadSource,
  SolarGainLoadSource,
  ConductionConvectionLoadSource,
  InfiltrationLoadSource,
} from "../lib/thermal-loads";
import { AirConditioner } from "../lib/air-conditioner";
import { ElectricFurnace } from "../lib/electric-furnace";
import { GasFurnace } from "../lib/gas-furnace";
import { SimpleHVACSystem } from "../lib/hvac-system";
import { celciusToFahrenheit } from "../lib/units";

export const heatingSetPointCAtom = atom(20);
export const coolingSetPointCAtom = atom(26);

export const heatingSetPointFAtom = atom((get) =>
  celciusToFahrenheit(get(heatingSetPointCAtom))
);
export const coolingSetPointFAtom = atom((get) =>
  celciusToFahrenheit(get(coolingSetPointCAtom))
);

export const floorSpaceSqFtAtom = atom(3000);

export const buildingGeometryAtom = atom<BuildingGeometry>((get) => {
  return new BuildingGeometry({
    floorSpaceSqFt: get(floorSpaceSqFtAtom),
    ceilingHeightFt: 9,
    numAboveGroundStories: 2,
    lengthToWidthRatio: 3,
    hasConditionedBasement: true,
  });
});

export const loadSourcesAtom = atom<ThermalLoadSource[]>((get) => {
  const buildingGeometry = get(buildingGeometryAtom);

  return [
    new OccupantsLoadSource(2),

    // TODO(jlfwong): these are a bit weird to have separately because they have
    // to share geometry & modifiers. Would perhaps be alleviated by having a
    // function to return standard loads for a building?
    new SolarGainLoadSource({ geometry: buildingGeometry, solarModifier: 1.0 }),

    new ConductionConvectionLoadSource({
      geometry: buildingGeometry,
      envelopeModifier: 0.15,
    }),
    new InfiltrationLoadSource({
      geometry: buildingGeometry,
      envelopeModifier: 0.65,
    }),
  ];
});

export const acAtom = atom(
  new AirConditioner({
    seer: 11,
    capacityBtusPerHour: 40000,
    elevationFeet: 0,
    speedSettings: "single-speed",
  })
);

// TODO(jlfwong): Elevation
export const gasFurnaceAtom = atom(
  new GasFurnace({
    afuePercent: 96,
    capacityBtusPerHour: 80000,
    elevationFeet: 0,
  })
);

export const gasFurnaceSystemAtom = atom((get) => {
  const gasFurnace = get(gasFurnaceAtom);
  const ac = get(acAtom);

  return new SimpleHVACSystem(`${gasFurnace.name} + ${ac.name}`, {
    coolingSetPointF: get(coolingSetPointFAtom),
    coolingAppliance: ac,

    heatingSetPointF: get(heatingSetPointFAtom),
    heatingAppliance: gasFurnace,
  });
});

// TODO(jlfwong): Elevation
export const electricFurnaceAtom = atom(
  new ElectricFurnace({
    capacityKw: 20,
  })
);

export const electricFurnaceSystemAtom = atom((get) => {
  const electricFurnace = get(electricFurnaceAtom);
  const ac = get(acAtom);

  return new SimpleHVACSystem(`${electricFurnace.name} + ${ac.name}`, {
    coolingSetPointF: get(coolingSetPointFAtom),
    coolingAppliance: ac,

    heatingSetPointF: get(heatingSetPointFAtom),
    heatingAppliance: electricFurnace,
  });
});
