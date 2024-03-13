import { BillingView } from "./billing-view";
import { TemperaturesView } from "./temperatures-view";
import React, { useState, createRef, useCallback } from "react";
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
  Input,
  Box,
  chakra,
  NumberInput,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInputField,
  NumberInputStepper,
  type InputProps,
} from "@chakra-ui/react";
import {
  useAtom,
  useAtomValue,
  type Atom,
  type WritableAtom,
  type PrimitiveAtom,
  useSetAtom,
} from "jotai";
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
    <Center mb={"40px"}>
      <Flex direction="column" gap={"40px"} width={"860px"} maxWidth={"100vw"}>
        <Flex direction="column">
          <Heading as="h1" size="4xl" mb={"20px"}>
            Heat Pump Calculator
          </Heading>
          <Flex direction="column" gap={"20px"}>
            <Flex direction="column" gap={0}>
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
                    disabled={true}
                    title="Arbitrary postal code input coming soon!"
                    onChange={(ev) => {
                      setPostalCode(ev.target.value);
                    }}
                  />
                </FullWidthFormControl>
                <NumericFormControl
                  label="House square footage"
                  atom={floorSpaceSqFtAtom}
                  minValue={250}
                  maxValue={100000}
                  step={250}
                />
              </HStack>
              <HStack>
                Switch to:
                <LocationLink postalCode="K2A 2Y3" placeName="Ottawa" />
                <LocationLink postalCode="V5K 0A1" placeName="Vancouver" />
                <LocationLink postalCode="H3H 2H9" placeName="Montreal" />
                <LocationLink postalCode="R3T 2N2" placeName="Winnipeg" />
                <LocationLink postalCode="T6G 2R3" placeName="Edmonton" />
              </HStack>
            </Flex>
            <HStack>
              <TemperatureControl
                label="Heat when colder than (°C)"
                atom={heatingSetPointCAtom}
              />
              <TemperatureControl
                label="Cool when hotter than (°C)"
                atom={coolingSetPointCAtom}
              />
              <TemperatureControl
                label="Switch to backup heat below (°C)"
                atom={auxSwitchoverTempCAtom}
              />
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
  postalCode: string;
  placeName: string;
}> = (props) => {
  const setPostalCode = useSetAtom(postalCodeAtom);

  const onClick: React.EventHandler<React.MouseEvent> = useCallback(
    (ev) => {
      setPostalCode(props.postalCode);
      ev.preventDefault();
    },
    [setPostalCode, props.postalCode]
  );
  return (
    <Box as="a" href="#" onClick={onClick} textDecoration={"underline"}>
      {props.placeName} ({props.postalCode})
    </Box>
  );
};

const TemperatureControl: React.FC<{
  atom: PrimitiveAtom<number>;
  label: string;
}> = (props) => {
  return (
    <NumericFormControl
      atom={props.atom}
      label={props.label}
      minValue={-50}
      maxValue={50}
      step={1}
    />
  );
};

const NumericFormControl: React.FC<
  {
    atom: PrimitiveAtom<number>;
    label: string;
    minValue: number;
    maxValue: number;
    step?: number;
  } & InputProps
> = (props) => {
  const [atomValue, setAtomValue] = useAtom(props.atom);

  const [internalValue, setInternalValue] = useState(atomValue.toString());

  function isValid(numeric: number) {
    if (
      isNaN(numeric) ||
      numeric < props.minValue ||
      numeric > props.maxValue
    ) {
      return false;
    }
    return true;
  }

  const isInvalid = !isValid(parseInt(internalValue, 10));

  return (
    <FullWidthFormControl isInvalid={isInvalid}>
      <FormLabel>{props.label}</FormLabel>
      <Input
        type="number"
        value={internalValue}
        min={props.minValue}
        max={props.maxValue}
        step={props.step ?? 1}
        /*
        // Unfortunately, there's no styling for both invalid & focused, and focus
        // takes precedences. IMO this is a design oversight, though perhaps it's
        // intentional.
        //
        // https://github.com/chakra-ui/chakra-ui/pull/2741
        */
        _focusVisible={isInvalid ? { borderWidth: 0 } : {}}
        onChange={(ev) => {
          const value = ev.target.value;
          setInternalValue(value);
          const numericValue = parseInt(value, 10);
          if (isValid(numericValue)) {
            setAtomValue(numericValue);
          }
        }}
        onBlur={() => {
          setInternalValue(atomValue.toString());
        }}
      />
    </FullWidthFormControl>
  );
};