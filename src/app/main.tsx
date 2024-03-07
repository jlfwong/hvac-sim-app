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
import { celciusToFahrenheit } from "../lib/units";
import {
  electricalUtilityForProvince,
  gasUtilityForProvince,
} from "./canadian-utility-plans";
import { PassiveLoadsView } from "./passive-loads-view";
import { useCanadianWeatherSource } from "./use-canadian-weather-source";
import { useSelectHeatpump } from "./use-select-heatpump";
import {
  Center,
  Flex,
  HStack,
  VStack,
  FormControl,
  FormLabel,
  Heading,
  StackDivider,
  Input,
  Box,
  chakra,
} from "@chakra-ui/react";
import { useAtom, useAtomValue } from "jotai";
import {
  buildingGeometryAtom,
  coolingSetPointCAtom,
  electricFurnaceAtom,
  electricFurnaceSystemAtom,
  floorSpaceSqFtAtom,
  gasFurnaceAtom,
  gasFurnaceSystemAtom,
  heatingSetPointCAtom,
  loadSources,
  loadSourcesAtom,
} from "./app-state";

export const Main: React.FC<{}> = (props) => {
  const [floorSpaceSqFt, setFloorSpaceSqFt] = useAtom(floorSpaceSqFtAtom);

  const { postalCode, setPostalCode, locationInfo, weatherInfo } =
    useCanadianWeatherSource("K2A 2Y3");

  const [coolingSetPointC, setCoolingSetPointC] = useAtom(coolingSetPointCAtom);
  const [heatingSetPointC, setHeatingSetPointC] = useAtom(heatingSetPointCAtom);

  const gasFurnace = useAtomValue(gasFurnaceAtom);
  const buildingGeometry = useAtomValue(buildingGeometryAtom);

  const auxHeatingAppliance = gasFurnace;
  const [auxSwitchoverTempC, setAuxSwitchoverTempC] = useState(-16);

  const coolingSetPointF = celciusToFahrenheit(coolingSetPointC);
  const heatingSetPointF = celciusToFahrenheit(heatingSetPointC);
  const auxSwitchoverTempF = celciusToFahrenheit(auxSwitchoverTempC);

  const electricFurnaceSystem = useAtomValue(electricFurnaceSystemAtom);
  const gasFurnaceSystem = useAtomValue(gasFurnaceSystemAtom);

  const loadSources = useAtomValue(loadSourcesAtom);

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
    <Center mb={40}>
      <Flex direction="column" gap={40} width={860} maxWidth={"100vw"}>
        <Flex direction="column">
          <Heading as="h1" size="4xl">
            Heat Pump Calculator
          </Heading>
          <StackDivider />
          <Flex direction="column" gap={20}>
            <Flex direction="column">
              <HStack>
                <FullWidthFormControl>
                  <Flex justifyContent={"space-between"}>
                    <FormLabel htmlFor="postal-code-input">
                      Postal Code
                    </FormLabel>
                    {/* Replace parentheticals to prevent confusion */}
                    <Box color={"grey"}>
                      {`(${
                        locationInfo?.placeName.replace(/\s+\(.*\)$/g, "") ||
                        "Unknown"
                      })`}
                    </Box>
                  </Flex>
                  <Input
                    id="postal-code-input"
                    value={postalCode}
                    onChange={(ev) => {
                      setPostalCode(ev.target.value);
                    }}
                  />
                </FullWidthFormControl>
                <FullWidthFormControl>
                  <FormLabel>House square footage</FormLabel>
                  <Input
                    type="number"
                    value={floorSpaceSqFt}
                    onChange={(ev) => {
                      const switchoverTempC = parseFloat(ev.target.value);
                      setFloorSpaceSqFt(switchoverTempC);
                    }}
                  />
                </FullWidthFormControl>
              </HStack>
              <HStack>
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
              </HStack>
            </Flex>
            <HStack>
              <FullWidthFormControl>
                <FormLabel>Heat when colder than (°C)</FormLabel>
                <Input
                  type="number"
                  value={heatingSetPointC}
                  onChange={(ev) => {
                    setHeatingSetPointC(parseFloat(ev.target.value));
                  }}
                />
              </FullWidthFormControl>
              <FullWidthFormControl>
                <FormLabel>Cool when hotter than (°C)</FormLabel>
                <Input
                  type="number"
                  value={coolingSetPointC}
                  onChange={(ev) => {
                    setCoolingSetPointC(parseFloat(ev.target.value));
                  }}
                />
              </FullWidthFormControl>
              <FullWidthFormControl>
                <FormLabel>Switch to backup heat when below (°C)</FormLabel>
                <Input
                  type="number"
                  value={auxSwitchoverTempC}
                  onChange={(ev) => {
                    setAuxSwitchoverTempC(parseFloat(ev.target.value));
                  }}
                />
              </FullWidthFormControl>
            </HStack>
          </Flex>
        </Flex>
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
      </Flex>
    </Center>
  );
};

const FullWidthFormControl = chakra(FormControl, {
  baseStyle: {
    display: "flex",
    flexGrow: 1,
    flexDirection: "column",
  },
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
