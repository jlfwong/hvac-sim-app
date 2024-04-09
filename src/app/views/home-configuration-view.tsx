import {
  Flex,
  HStack,
  FormLabel,
  Input,
  Box,
  type InputProps,
  Select,
  Spacer,
} from "@chakra-ui/react";
import React, { useCallback, useState } from "react";
import {
  floorSpaceSqFtAtom,
  optimizeForAtom,
  postalCodeAtom,
} from "../app-state/config-state";
import { useAtom, useAtomValue, useSetAtom, type PrimitiveAtom } from "jotai";
import { FullWidthFormControl } from "./utils";
import { locationInfoAtom } from "../app-state/canadian-weather-state";

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
      {props.placeName}
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
        backgroundColor="white"
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

export const HomeConfigurationView: React.FC<{}> = (props) => {
  const [postalCode, setPostalCode] = useAtom(postalCodeAtom);
  const locationInfo = useAtomValue(locationInfoAtom);
  const [optimizeFor, setOptimizeFor] = useAtom(optimizeForAtom);

  return (
    <Flex
      direction="column"
      padding={"20px"}
      outline={"1px dashed #D3E3FD"}
      backgroundColor={"#D3E3FD"}
      gap={"20px"}
    >
      <Flex gap={0} direction="column">
        <HStack>
          <FullWidthFormControl>
            <Flex justifyContent={"space-between"}>
              <FormLabel htmlFor="postal-code-input">Postal Code</FormLabel>
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
              value={postalCode ?? ""}
              backgroundColor={"white"}
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
          <>Quick links:</>
          <LocationLink postalCode="M5V 0H8" placeName="Toronto" />
          <LocationLink postalCode="H3H 2H9" placeName="Montreal" />
          <LocationLink postalCode="V5K 0A1" placeName="Vancouver" />
          <LocationLink postalCode="T2P 0A9" placeName="Calgary" />
          <LocationLink postalCode="T6G 2R3" placeName="Edmonton" />
          <LocationLink postalCode="K2A 2Y3" placeName="Ottawa" />
          <LocationLink postalCode="R3T 2N2" placeName="Winnipeg" />
          <LocationLink postalCode="G1R 1R5" placeName="Quebec City" />
        </HStack>
      </Flex>
      <HStack>
        <FullWidthFormControl>
          <FormLabel>Optimize for</FormLabel>
          <Select
            background={"white"}
            value={optimizeFor}
            onChange={(ev) => {
              switch (ev.currentTarget.value) {
                case "cost": {
                  setOptimizeFor("cost");
                  break;
                }
                case "emissions": {
                  setOptimizeFor("emissions");
                  break;
                }
              }
            }}
          >
            <option value="cost">Cost Savings</option>
            <option value="emissions">Emissions Reduction</option>
          </Select>
        </FullWidthFormControl>
      </HStack>
    </Flex>
  );
};
