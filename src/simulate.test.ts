import { BuildingGeometry } from "./building-geometry";
import { SimpleThermostat } from "./thermostat";
import ottawaData2023 from "../data/weather/2023-ottawa-era5.json";
import { JSONBackedHourlyWeatherSource } from "./weather";
import { AirConditioner } from "./air-conditioner";
import { HVACAppliance } from "./types";
import {
  ConductionConvectionLoadSource,
  InfiltrationLoadSource,
  OccupantsLoadSource,
  SolarGainLoadSource,
  ThermalLoadSource,
} from "./thermal-loads";
import { GasFurnace } from "./furnace";
import {
  SimpleElectricalUtilityPlan,
  SimpleNaturalGasUtilityPlan,
  TimeOfUseElectricalUtilityPlan,
  TimeOfUsePeriod,
} from "./billing";
import { DateTime } from "luxon";
import { simulateBuildingHVAC } from "./simulate";

describe("simulateBuildingHVAC", () => {
  const buildingGeometry = new BuildingGeometry({
    floorSpaceSqFt: 3000,
    ceilingHeightFt: 9,
    numAboveGroundStories: 2,
    lengthToWidthRatio: 3,
    hasConditionedBasement: true,
  });

  const loadSources: ThermalLoadSource[] = [
    new OccupantsLoadSource(2),

    // TODO(jlfwong): these are a bit weird to have separately because they have
    // to share geometry & modifiers. Would perhaps be alleviated by having a
    // function to return standard loads for a buildling?
    new SolarGainLoadSource({ geometry: buildingGeometry, solarModifier: 1.0 }),
    new ConductionConvectionLoadSource({
      geometry: buildingGeometry,
      envelopeModifier: 0.65,
    }),
    new InfiltrationLoadSource({
      geometry: buildingGeometry,
      envelopeModifier: 0.65,
    }),
  ];

  const hvacAppliances: HVACAppliance[] = [
    new AirConditioner({
      seer: 11,
      capacityBtusPerHour: 40000,
      elevationFeet: 0,
      speedSettings: "single-speed",
    }),
    new GasFurnace({
      afuePercent: 96,
      capacityBtusPerHour: 80000,
      elevationFeet: 0,
    }),
  ];

  const thermostat = new SimpleThermostat({
    minimumTempF: 70,
    maximumTempF: 80,
  });

  const weatherSource = new JSONBackedHourlyWeatherSource(ottawaData2023);

  const utilityPlans = {
    electrical: new SimpleElectricalUtilityPlan({
      fixedCostPerMonth: 20,
      costPerKwh: 0.14,
    }),
    naturalGas: new SimpleNaturalGasUtilityPlan({
      fixedCostPerMonth: 22,
      costPerCcf: 15,
    }),
  };

  it("can simulate a week in January", () => {
    const options = { zone: "America/Toronto" };
    const localStartTime = DateTime.fromObject(
      {
        year: 2023,
        month: 1,
        day: 1,
      },
      options
    );
    const localEndTime = DateTime.fromObject(
      {
        year: 2023,
        month: 1,
        day: 7,
      },
      options
    ).endOf("day");

    const result = simulateBuildingHVAC({
      localStartTime,
      localEndTime,
      initialInsideAirTempF: 75,
      buildingGeometry,
      loadSources,
      hvacAppliances,
      thermostat,
      weatherSource,
      utilityPlans,
    });

    expect(result.bills.length).toBe(2);
    expect(result.hourlyResults.length).toBe(7 * 24);
  });

  it("can simulate a year", () => {
    const options = { zone: "America/Toronto" };
    const localStartTime = DateTime.fromObject(
      {
        year: 2023,
        month: 1,
        day: 1,
      },
      options
    );
    const localEndTime = DateTime.fromObject(
      {
        year: 2023,
        month: 12,

        // TODO(jlfwong): Update the dataset to include the the full *local*
        // year, not the full UTC year. Then this can be 31.
        day: 30,
      },
      options
    ).endOf("day");

    const result = simulateBuildingHVAC({
      localStartTime,
      localEndTime,
      initialInsideAirTempF: 75,
      buildingGeometry,
      loadSources,
      hvacAppliances,
      thermostat,
      weatherSource,
      utilityPlans,
    });

    expect(result.bills.length).toBe(2 * 12);
    expect(result.hourlyResults.length).toBe(364 * 24);
  });
});