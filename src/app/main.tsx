import { DateTime } from "luxon";
import { AirConditioner } from "../lib/air-conditioner";
import {
  SimpleElectricalUtilityPlan,
  SimpleNaturalGasUtilityPlan,
} from "../lib/billing";
import { BuildingGeometry } from "../lib/building-geometry";
import { GasFurnace } from "../lib/gas-furnace";
import { AirSourceHeatPump, panasonicHeatPumpRatings } from "../lib/heatpump";
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
import {
  JSONWeatherEntry,
  JSONBackedHourlyWeatherSource,
  WeatherSource,
} from "../lib/weather";
import { BillingView } from "./billing-view";
import { TemperaturesView } from "./temperatures-view";
import React, { useState, useEffect } from "react";
import { ElectricFurnace } from "../lib/electric-furnace";
import { styled } from "./styled";
import { celciusToFahrenheit } from "../lib/units";
import {
  electricalUtilityForProvince,
  gasUtilityForProvince,
} from "./canadian-utility-plans";

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  // Check if the response is ok (status in the range 200-299)
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return await response.json(); // Parse the response body as JSON
}

interface LocationInfo {
  code: string;
  placeName: string;
  provinceCode: string;
}

type PostalCodesJson = { [forwardSortationArea: string]: LocationInfo };

function useCanadianWeatherSource(initialPostalCode: string) {
  const [postalCode, setPostalCode] = useState(initialPostalCode);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [weatherSource, setWeatherSource] = useState<WeatherSource | null>(
    null
  );

  const [caPostalCodesJson, setCaPostalCodesJson] =
    useState<PostalCodesJson | null>(null);

  useEffect(() => {
    fetchJSON<PostalCodesJson>("./data/ca-postal-codes.json").then((data) =>
      setCaPostalCodesJson(data)
    );
  }, []);

  useEffect(() => {
    if (
      !caPostalCodesJson ||
      !/^[A-Za-z][0-9][A-Za-z] ?[0-9][A-Za-z][0-9]$/.exec(postalCode)
    ) {
      return;
    }

    const forwardSortationArea = postalCode.substring(0, 3).toUpperCase();

    const info = caPostalCodesJson[forwardSortationArea];

    // TODO(jlfwong): Consider using AbortController here
    let cancelled = false;

    if (info) {
      setLocationInfo(info);

      // TODO(jlfwong): Update this to use S3 buckets when ready
      fetchJSON<JSONWeatherEntry[]>(
        `./data/weather/2023-${forwardSortationArea}-era5.json`
      ).then((weatherDataJson) => {
        if (!cancelled) {
          setWeatherSource(new JSONBackedHourlyWeatherSource(weatherDataJson));
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [postalCode, caPostalCodesJson]);

  return {
    postalCode,
    setPostalCode: (newPostalCode: string) => {
      if (newPostalCode === postalCode) {
        return;
      }

      // Whenever postal code changes, we clear the weather source and the
      // location info. We can't do this in the useEffect beacuse then views
      // will see a state where the new postal code is used, but the old weather
      // data and location info is used for a single render.
      setPostalCode(newPostalCode);
      setWeatherSource(null);
      setLocationInfo(null);
    },
    locationInfo,
    weatherSource,
  };
}

export const Main: React.FC<{}> = (props) => {
  const [floorSpaceSqFt, setFloorSpaceSqFt] = useState(3000);

  const { postalCode, setPostalCode, locationInfo, weatherSource } =
    useCanadianWeatherSource("V5K 0A1");

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

  const gasFurnace = new GasFurnace({
    afuePercent: 96,
    capacityBtusPerHour: 80000,
    elevationFeet: 0,
  });

  const [coolingSetPointC, setCoolingSetPointC] = useState(26);
  const [heatingSetPointC, setHeatingSetPointC] = useState(20);

  const coolingAppliance = ac;
  const heatingAppliance = heatpump;

  const auxHeatingAppliance = gasFurnace;
  const [auxSwitchoverTempC, setAuxSwitchoverTempC] = useState(-16);

  const electricFurnace = new ElectricFurnace({
    capacityKw: 20,
  });

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

  const provinceCode = "BC";

  const utilityPlans = {
    electrical: () => electricalUtilityForProvince(provinceCode),
    naturalGas: () => gasUtilityForProvince(provinceCode),
  };

  const coolingSetPointF = celciusToFahrenheit(coolingSetPointC);
  const heatingSetPointF = celciusToFahrenheit(heatingSetPointC);
  const auxSwitchoverTempF = celciusToFahrenheit(auxSwitchoverTempC);

  const dualFuelSystem = new DualFuelTwoStageHVACSystem(
    "Heat Pump with Gas Furnace Backup",
    {
      coolingSetPointF,
      coolingAppliance,

      heatingSetPointF,
      heatingAppliance,

      auxSwitchoverTempF,
      auxHeatingAppliance,

      // Like the "Compressor Stage 1 Max Runtime" setting in
      // ecobee
      stage1MaxDurationMinutes: 120,

      // Like the "Compressor Stage 2 Temperature Delta" setting
      // in ecobee
      stage2TemperatureDeltaF: 1,
    }
  );

  const alternativeSystem = new SimpleHVACSystem(
    `Alternative - ${gasFurnace.name}`,
    {
      coolingSetPointF,
      coolingAppliance,

      heatingSetPointF,
      heatingAppliance: gasFurnace,
    }
  );

  const dualFuelResult = weatherSource
    ? simulateBuildingHVAC({
        localStartTime,
        localEndTime,
        initialInsideAirTempF: 72.5,
        buildingGeometry,
        hvacSystem: dualFuelSystem,
        loadSources,
        weatherSource,
        utilityPlans,
      })
    : null;

  const alternativeResult = weatherSource
    ? simulateBuildingHVAC({
        localStartTime,
        localEndTime,
        initialInsideAirTempF: 72.5,
        buildingGeometry,
        hvacSystem: alternativeSystem,
        loadSources,
        weatherSource,
        utilityPlans,
      })
    : null;

  return (
    <div>
      <InputRow>
        Postal Code
        <input
          value={postalCode}
          onChange={(ev) => {
            setPostalCode(ev.target.value);
          }}
        />
      </InputRow>
      <InputRow>
        <a onClick={() => setPostalCode("K2A 2Y3")}>Ottawa</a>
        <a onClick={() => setPostalCode("V5K 0A1")}>Vancouver</a>
      </InputRow>
      <div>{locationInfo && locationInfo.placeName}</div>
      <InputRow>
        House Square Feet
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
        Heating Set Point (°C)
        <input
          type="number"
          value={heatingSetPointC}
          onChange={(ev) => {
            setHeatingSetPointC(parseFloat(ev.target.value));
          }}
        />
      </InputRow>
      <InputRow>
        Cooling Set Point (°C)
        <input
          type="number"
          value={coolingSetPointC}
          onChange={(ev) => {
            setCoolingSetPointC(parseFloat(ev.target.value));
          }}
        />
      </InputRow>
      <InputRow>
        Auxiliary Switchover Temperature (°C)
        <input
          type="number"
          value={auxSwitchoverTempC}
          onChange={(ev) => {
            setAuxSwitchoverTempC(parseFloat(ev.target.value));
          }}
        />
      </InputRow>
      {dualFuelResult && alternativeResult && (
        <>
          <TemperaturesView simulationResult={dualFuelResult} />
          <BillingView
            simulationResults={[dualFuelResult, alternativeResult]}
          />
        </>
      )}
    </div>
  );
};

const InputRow = styled("InputRow", "div", {
  display: "flex",
  gap: "1em",
});
