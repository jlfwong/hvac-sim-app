import { floorSpaceSqFtAtom } from "./config-state";

import { atom } from "jotai";
import { BuildingGeometry } from "../../lib/building-geometry";
import {
  type ThermalLoadSource,
  OccupantsLoadSource,
  SolarGainLoadSource,
  ConductionConvectionLoadSource,
  InfiltrationLoadSource,
} from "../../lib/thermal-loads";

export const buildingGeometryAtom = atom<BuildingGeometry | null>((get) => {
  const floorSpaceSqFt = get(floorSpaceSqFtAtom);

  if (floorSpaceSqFt == null) return null;

  return new BuildingGeometry({
    floorSpaceSqFt: floorSpaceSqFt,
    ceilingHeightFt: 9,
    numAboveGroundStories: 2,
    lengthToWidthRatio: 3,
    hasConditionedBasement: true,
  });
});

export const loadSourcesAtom = atom<ThermalLoadSource[] | null>((get) => {
  const buildingGeometry = get(buildingGeometryAtom);

  if (buildingGeometry == null) return null;

  return [
    new OccupantsLoadSource(2),

    new SolarGainLoadSource({ geometry: buildingGeometry, solarModifier: 1 }),

    new ConductionConvectionLoadSource({
      geometry: buildingGeometry,
      envelopeModifier: 0.65,
    }),
    new InfiltrationLoadSource({
      geometry: buildingGeometry,
      envelopeModifier: 0.65,
    }),
  ];
});
