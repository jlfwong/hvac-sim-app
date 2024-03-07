import { DateTime } from "luxon";
import { AirConditioner } from "../lib/air-conditioner";
import { BuildingGeometry } from "../lib/building-geometry";
import { GasFurnace } from "../lib/gas-furnace";
import {
  DualFuelTwoStageHVACSystem,
  SimpleHVACSystem,
} from "../lib/hvac-system";
import { HVACSystem } from "../lib/types";
import { HVACSimulationResult, simulateBuildingHVAC } from "../lib/simulate";
import {
  ThermalLoadSource,
  OccupantsLoadSource,
  SolarGainLoadSource,
  ConductionConvectionLoadSource,
  InfiltrationLoadSource,
} from "../lib/thermal-loads";
import { BillingView } from "./billing-view";
import { TemperaturesView } from "./temperatures-view";
import React, { useState, useCallback } from "react";
import { ElectricFurnace } from "../lib/electric-furnace";
import { styled } from "./styled";
import { celciusToFahrenheit } from "../lib/units";
import {
  electricalUtilityForProvince,
  gasUtilityForProvince,
} from "./canadian-utility-plans";
import { PassiveLoadsView } from "./passive-loads-view";
import { useCanadianWeatherSource } from "./use-canadian-weather-source";
import { useSelectHeatpump } from "./use-select-heatpump";

export const Main: React.FC<{}> = (props) => {
  const [floorSpaceSqFt, setFloorSpaceSqFt] = useState(3000);

  const { postalCode, setPostalCode, locationInfo, weatherInfo } =
    useCanadianWeatherSource("K2A 2Y3");

  const buildingGeometry = new BuildingGeometry({
    floorSpaceSqFt,
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
      envelopeModifier: 0.15,
    }),
    new InfiltrationLoadSource({
      geometry: buildingGeometry,
      envelopeModifier: 0.65,
    }),
  ];

  const ac = new AirConditioner({
    seer: 11,
    capacityBtusPerHour: 40000,
    elevationFeet: 0,
    speedSettings: "single-speed",
  });

  const gasFurnace = new GasFurnace({
    afuePercent: 96,
    capacityBtusPerHour: 80000,
    elevationFeet: 0,
  });

  const electricFurnace = new ElectricFurnace({
    capacityKw: 20,
  });

  const [coolingSetPointC, setCoolingSetPointC] = useState(26);
  const [heatingSetPointC, setHeatingSetPointC] = useState(20);

  const auxHeatingAppliance = gasFurnace;
  const [auxSwitchoverTempC, setAuxSwitchoverTempC] = useState(-16);

  const coolingSetPointF = celciusToFahrenheit(coolingSetPointC);
  const heatingSetPointF = celciusToFahrenheit(heatingSetPointC);
  const auxSwitchoverTempF = celciusToFahrenheit(auxSwitchoverTempC);

  const gasFurnaceSystem = new SimpleHVACSystem(
    `${gasFurnace.name} + ${ac.name}`,
    {
      coolingSetPointF,
      coolingAppliance: ac,

      heatingSetPointF,
      heatingAppliance: gasFurnace,
    }
  );

  const electricFurnaceSystem = new SimpleHVACSystem(
    `${electricFurnace.name} + ${ac.name}`,
    {
      coolingSetPointF,
      coolingAppliance: ac,

      heatingSetPointF,
      heatingAppliance: electricFurnace,
    }
  );

  let simulations: HVACSimulationResult[] | null = null;

  const heatPumpCandidates = useSelectHeatpump(
    weatherInfo
      ? {
          weatherInfo,
          coolingSetPointInsideTempF: coolingSetPointF,
          heatingSetPointInsideTempF: heatingSetPointF,
          auxSwitchoverTempF,
          loadSources,
        }
      : null
  );

  if (locationInfo && weatherInfo && heatPumpCandidates) {
    const dtOptions = { zone: weatherInfo.timezoneName };
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
        day: 31,
      },
      dtOptions
    ).endOf("day");

    const utilityPlans = {
      electrical: () => electricalUtilityForProvince(locationInfo.provinceCode),
      naturalGas: () => gasUtilityForProvince(locationInfo.provinceCode),
    };

    const systems: HVACSystem[] = [gasFurnaceSystem, electricFurnaceSystem];

    for (let i = 0; i < Math.min(heatPumpCandidates.length, 1); i++) {
      const heatpump = heatPumpCandidates[i].heatpump;

      // TODO(jlfwong): Sometimes the top candidate doesn't actually end up
      // being the cheapest. This *might* be because the heatpump selection
      // algorithm assumes perfect modulation, whereas the simulation (so far)
      // only uses a dumb two-stage algorithm.
      systems.unshift(
        new DualFuelTwoStageHVACSystem(
          `Dual Fuel Two Stage (${heatpump.name} + ${gasFurnace.name})`,
          {
            coolingSetPointF,
            coolingAppliance: heatpump,

            heatingSetPointF,
            heatingAppliance: heatpump,

            auxSwitchoverTempF,
            auxHeatingAppliance,

            // Like the "Compressor Stage 1 Max Runtime" setting in
            // ecobee
            stage1MaxDurationMinutes: 120,

            // Like the "Compressor Stage 2 Temperature Delta" setting
            // in ecobee
            stage2TemperatureDeltaF: 1,
          }
        )
      );
    }

    simulations = systems.map((hvacSystem) =>
      simulateBuildingHVAC({
        localStartTime,
        localEndTime,
        initialInsideAirTempF: 72.5,
        buildingGeometry,
        hvacSystem,
        loadSources,
        weatherSource: weatherInfo.weatherSource,
        utilityPlans,
      })
    );
  }

  return (
    <MainWrapper>
      <h1>Heat Pump Calculator</h1>
      <InputsWrapper>
        <InputRow>
          Postal Code
          <input
            value={postalCode}
            onChange={(ev) => {
              setPostalCode(ev.target.value);
            }}
          />
          {/* Replace parentheticals to prevent confusion */}
          {locationInfo &&
            `(${locationInfo.placeName.replace(/\s+\(.*\)$/g, "")})`}
        </InputRow>
        <InputRow>
          Switch to:
          <LocationLink
            setPostalCode={setPostalCode}
            postalCode="K2A 2Y3"
            placeName="Ottawa"
          />
          <LocationLink
            setPostalCode={setPostalCode}
            postalCode="V5K 0A1"
            placeName="Vancouver"
          />
          <LocationLink
            setPostalCode={setPostalCode}
            postalCode="H3H 2H9"
            placeName="Montreal"
          />
          <LocationLink
            setPostalCode={setPostalCode}
            postalCode="R3T 2N2"
            placeName="Winnipeg"
          />
          <LocationLink
            setPostalCode={setPostalCode}
            postalCode="T6G 2R3"
            placeName="Edmonton"
          />
        </InputRow>
        <InputRow>
          House square footage
          <input
            type="number"
            value={floorSpaceSqFt}
            onChange={(ev) => {
              const switchoverTempC = parseFloat(ev.target.value);
              setFloorSpaceSqFt(switchoverTempC);
            }}
          />
        </InputRow>
        <InputRow>
          Heat when colder than (°C)
          <input
            type="number"
            value={heatingSetPointC}
            onChange={(ev) => {
              setHeatingSetPointC(parseFloat(ev.target.value));
            }}
          />
        </InputRow>
        <InputRow>
          Cool when hotter than (°C)
          <input
            type="number"
            value={coolingSetPointC}
            onChange={(ev) => {
              setCoolingSetPointC(parseFloat(ev.target.value));
            }}
          />
        </InputRow>
        <InputRow>
          Switch to backup heat when below (°C)
          <input
            type="number"
            value={auxSwitchoverTempC}
            onChange={(ev) => {
              setAuxSwitchoverTempC(parseFloat(ev.target.value));
            }}
          />
        </InputRow>
      </InputsWrapper>
      {simulations && (
        <>
          <BillingView simulations={simulations} />
          <TemperaturesView
            heatingSetPointC={heatingSetPointC}
            coolingSetPointC={coolingSetPointC}
            simulationResult={simulations[simulations.length - 1]}
          />
          <PassiveLoadsView simulationResult={simulations[0]} />
        </>
      )}
    </MainWrapper>
  );
};

const InputRow = styled("InputRow", "div", {
  display: "flex",
  alignItems: "baseline",
  gap: "1em",
  marginBottom: 10,
});

const MainWrapper = styled("MainWrapper", "div", {
  margin: "0 auto",
  width: 860,
  maxWidth: "100vw",
});

const InputsWrapper = styled("MainWrapper", "div", {
  marginBottom: 20,
  paddingTop: 20,
});

const LocationLink: React.FC<{
  setPostalCode: (postalCode: string) => void;
  postalCode: string;
  placeName: string;
}> = (props) => {
  const onClick: React.EventHandler<React.MouseEvent> = useCallback(
    (ev) => {
      props.setPostalCode(props.postalCode);
      ev.preventDefault();
    },
    [props.setPostalCode, props.postalCode]
  );
  return (
    <a href="#" onClick={onClick}>
      {props.placeName} ({props.postalCode})
    </a>
  );
};
