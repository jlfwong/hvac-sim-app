import { BillingView } from "./views/billing-view";
import { TemperaturesView } from "./views/temperatures-view";
import React, { useState, useCallback } from "react";
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
  type InputProps,
} from "@chakra-ui/react";
import { useAtom, useAtomValue, type PrimitiveAtom, useSetAtom } from "jotai";
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

const Paragraphs = chakra(Flex, {
  baseStyle: {
    flexDirection: "column",
    marginTop: "20px",
    marginBottom: "20px",
    fontSize: "25px",
    fontFamily: "Averia Serif Libre",
    lineHeight: "150%",
    gap: "1em",
  },
});

export const HeroMessaging: React.FC<{}> = (props) => {
  return (
    <Paragraphs>
      <p>
        To end climate change, we Canadians need to stop burning fossil fuels
        inside our homes. But for all of us that heat our homes with gas
        furnaces, what are we supposed to do?{" "}
        <strong style={{ color: "#1D82F8" }}>Freeze</strong>?
      </p>

      <p>
        No, of course not. Thankfully, we have a modern solution to{" "}
        <strong style={{ color: "#89C606" }}>all-electric</strong> heating
        that’s way more cost-efficient than baseboard heaters. They’re called{" "}
        <strong style={{ color: "#F8861D" }}>heat pumps</strong>.
      </p>

      <img src="/images/heatpump-hero.webp" />

      <p>
        In the last decade, heat pumps have gotten way more efficient in cold
        climates. They're ready for the Canadian winters—6% of Canadian homes
        already use them.
      </p>

      <p>
        Replacing a gas furnace with a heat pump in your home is one of the most
        effective ways of reducing your emissions, and in many parts of Canada,
        it'll save you $$$ too.
      </p>

      <p>
        Want to estimate costs and emissions savings for your own home? Great!
        We built a calculator for you to help. Just enter in some basic
        information about your home:
      </p>
    </Paragraphs>
  );
};

export const Main: React.FC<{}> = (props) => {
  const [postalCode, setPostalCode] = useAtom(postalCodeAtom);
  const locationInfo = useAtomValue(locationInfoAtom);
  const [coolingSetPointC] = useAtom(coolingSetPointCAtom);
  const [heatingSetPointC] = useAtom(heatingSetPointCAtom);

  const simulations = useAtomValue(simulationsAtom);

  const electricityPricePerKwh = useAtomValue(electricityPricePerKwhAtom);
  const naturalGasPricePerCubicMetre = useAtomValue(
    naturalGasPricePerCubicMetreAtom
  );

  return (
    <Center mb={"40px"}>
      <Flex direction="column" gap={"40px"} width={"860px"} maxWidth={"100vw"}>
        <Flex direction="column">
          <HeroMessaging />
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
                <>Quick links:</>
                <LocationLink postalCode="K2A 2Y3" placeName="Ottawa" />
                <LocationLink postalCode="V5K 0A1" placeName="Vancouver" />
                <LocationLink postalCode="H3H 2H9" placeName="Montreal" />
                <LocationLink postalCode="R3T 2N2" placeName="Winnipeg" />
                <LocationLink postalCode="T6G 2R3" placeName="Edmonton" />
              </HStack>
            </Flex>
            {/* TODO(jlfwong): Move this into assumptions */}
            {/*
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
                label="Switch to gas heating below (°C)"
                atom={auxSwitchoverTempCAtom}
              />
            </HStack>
            */}
          </Flex>
        </Flex>
        {simulations && (
          <Box>
            <ul>
              {simulations.map((s) => {
                return (
                  <li>
                    <strong>{s.name}: </strong>
                    {(s.emissionsGramsCO2e / 1e6).toFixed(1)} tons CO2e/year
                  </li>
                );
              })}
            </ul>
          </Box>
        )}
        {simulations &&
        naturalGasPricePerCubicMetre != null &&
        electricityPricePerKwh != null ? (
          <>
            <BillingView
              simulations={simulations}
              pricePerCubicMetre={naturalGasPricePerCubicMetre}
              pricePerKwh={electricityPricePerKwh}
            />
            {/* Advanced views that we'll hide for now
              <EquipmentEfficiencyView />
              <PassiveLoadsView simulationResult={simulations[0]} />
              */}
            <Paragraphs>
              <p>
                <strong>Skeptical of the math?</strong> Read on to check our
                assumptions, look at our sources, or if you’re feeling
                particularly adventurous, read the{" "}
                <a
                  style={{ textDecoration: "underline" }}
                  href="https://github.com/jlfwong/hvac-sim-app"
                >
                  full source code
                </a>
                .
              </p>
              <p>First, we pull hourly weather data for all of 2023.</p>
            </Paragraphs>
            <TemperaturesView
              heatingSetPointC={heatingSetPointC}
              coolingSetPointC={coolingSetPointC}
              simulationResult={simulations[0]}
            />
          </>
        ) : (
          <Box height={"1400px"} />
        )}
        {/* TODO(jlfwong): Loading animation graphic instead of the 1400px box */}
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
