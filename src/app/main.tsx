import { DateTime } from "luxon";
import { AirConditioner } from "../lib/air-conditioner";
import {
  SimpleElectricalUtilityPlan,
  SimpleNaturalGasUtilityPlan,
} from "../lib/billing";
import { BuildingGeometry } from "../lib/building-geometry";
import { GasFurnace } from "../lib/gas-furnace";
import { AirSourceHeatPump, panasonicHeatPumpRatings } from "../lib/heatpump";
import { DualFuelTwoStageHVACSystem, HVACSystem } from "../lib/hvac-system";
import { HVACSimulationResult, simulateBuildingHVAC } from "../lib/simulate";
import {
  ThermalLoadSource,
  OccupantsLoadSource,
  SolarGainLoadSource,
  ConductionConvectionLoadSource,
  InfiltrationLoadSource,
} from "../lib/thermal-loads";
import {
  JSONWeatherEntry,
  JSONBackedHourlyWeatherSource,
  WeatherSource,
} from "../lib/weather";
import { BillingView } from "./billing-view";
import { TemperaturesView } from "./temperatures-view";
import React, { useState, useEffect } from "react";

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
  // function to return standard loads for a building?
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

const heatpump = new AirSourceHeatPump({
  elevationFeet: 0,
  ratings: panasonicHeatPumpRatings,
});

const ac = new AirConditioner({
  seer: 11,
  capacityBtusPerHour: 40000,
  elevationFeet: 0,
  speedSettings: "single-speed",
});

const furnace = new GasFurnace({
  afuePercent: 96,
  capacityBtusPerHour: 80000,
  elevationFeet: 0,
});

function runSimulation(options: {
  hvacSystem: HVACSystem;
  weatherSource: WeatherSource;
}): HVACSimulationResult {
  console.log("Running simulation");
  const dtOptions = { zone: "America/Toronto" };
  const localStartTime = DateTime.fromObject(
    {
      year: 2023,
      month: 1,
      day: 1,
    },
    dtOptions
  );
  const localEndTime = DateTime.fromObject(
    {
      year: 2023,
      month: 12,

      // TODO(jlfwong): Update the dataset to include the the full *local*
      // year, not the full UTC year. Then this can be 31.
      day: 30,
    },
    dtOptions
  ).endOf("day");

  const utilityPlans = {
    electrical: new SimpleElectricalUtilityPlan({
      fixedCostPerMonth: 20,
      costPerKwh: 0.1368,
    }),
    naturalGas: new SimpleNaturalGasUtilityPlan({
      fixedCostPerMonth: 22,
      costPerCcf: 1.19 + 0.42,
    }),
  };

  return simulateBuildingHVAC({
    localStartTime,
    localEndTime,
    initialInsideAirTempF: 72.5,
    buildingGeometry,
    hvacSystem: options.hvacSystem,
    loadSources,
    weatherSource: options.weatherSource,
    utilityPlans,
  });
}

export const Main: React.FC<{
  jsonWeatherData: JSONWeatherEntry[];
}> = (props) => {
  const [coolingSetPointF, setCoolingSetPointF] = useState(80);
  const [heatingSetPointF, setHeatingSetPointF] = useState(70);

  const coolingAppliance = ac;
  const heatingAppliance = heatpump;

  const auxHeatingAppliance = furnace;
  const [auxSwitchoverTempF, setAuxSwitchoverTempF] = useState(-5);
  const weatherSource = new JSONBackedHourlyWeatherSource(
    props.jsonWeatherData
  );

  const simulationResult = runSimulation({
    weatherSource,
    hvacSystem: new DualFuelTwoStageHVACSystem({
      coolingSetPointF,
      coolingAppliance,

      heatingSetPointF: 70,
      heatingAppliance,

      auxSwitchoverTempF,
      auxHeatingAppliance,

      // Like the "Compressor Stage 1 Max Runtime" setting in
      // ecobee
      stage1MaxDurationMinutes: 120,

      // Like the "Compressor Stage 2 Temperature Delta" setting
      // in ecobee
      stage2TemperatureDeltaF: 1,
    }),
  });

  return (
    <div>
      <div>
        <input
          type="number"
          value={auxSwitchoverTempF}
          onChange={(ev) => {
            setAuxSwitchoverTempF(parseInt(ev.target.value));
          }}
        />
      </div>
      <TemperaturesView simulationResult={simulationResult} />
      <BillingView simulationResult={simulationResult} />
    </div>
  );
};
