import { BillingView } from "./billing-view";
import { TemperaturesView } from "./temperatures-view";
import React, { useCallback } from "react";
import { locationInfoAtom } from "./app-state/canadian-weather-state";
import {
  auxSwitchoverTempCAtom,
  postalCodeAtom,
} from "./app-state/config-state";
import {
  Center,
  Flex,
  HStack,
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
  coolingSetPointCAtom,
  floorSpaceSqFtAtom,
  heatingSetPointCAtom,
} from "./app-state/config-state";
import { simulationsAtom } from "./app-state/simulations-state";
import {
  electricityPricePerKwhAtom,
  naturalGasPricePerCubicMetreAtom,
} from "./app-state/canadian-utilities-state";

export const Main: React.FC<{}> = (props) => {
  const [floorSpaceSqFt, setFloorSpaceSqFt] = useAtom(floorSpaceSqFtAtom);

  const [postalCode, setPostalCode] = useAtom(postalCodeAtom);
  const locationInfo = useAtomValue(locationInfoAtom);
  const [coolingSetPointC, setCoolingSetPointC] = useAtom(coolingSetPointCAtom);
  const [heatingSetPointC, setHeatingSetPointC] = useAtom(heatingSetPointCAtom);

  const [auxSwitchoverTempC, setAuxSwitchoverTempC] = useAtom(
    auxSwitchoverTempCAtom
  );

  const simulations = useAtomValue(simulationsAtom);

  const electricityPricePerKwh = useAtomValue(electricityPricePerKwhAtom);
  const naturalGasPricePerCubicMetre = useAtomValue(
    naturalGasPricePerCubicMetreAtom
  );

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
        {simulations &&
          naturalGasPricePerCubicMetre != null &&
          electricityPricePerKwh != null && (
            <>
              <BillingView
                simulations={simulations}
                pricePerCubicMetre={naturalGasPricePerCubicMetre}
                pricePerKwh={electricityPricePerKwh}
              />
              <TemperaturesView
                heatingSetPointC={heatingSetPointC}
                coolingSetPointC={coolingSetPointC}
                simulationResult={simulations[0]}
              />
              {/*
            // TODO(jlfwong): Create a toggle for this
            <PassiveLoadsView simulationResult={simulations[0]} />
            */}
            </>
          )}
      </Flex>
    </Center>
  );
};

const FullWidthFormControl = chakra(FormControl, {
  baseStyle: {
    display: "flex",
    flex: 1,
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
