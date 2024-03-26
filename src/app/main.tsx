import { BillingView } from "./views/monthly-billing-view";
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
import {
  electricityPricePerKwhAtom,
  naturalGasPricePerCubicMetreAtom,
} from "./app-state/canadian-utilities-state";
import { EmissionsView } from "./views/emissions-view";
import { AnnualBillingView } from "./views/annual-billing-view";
import { PassiveLoadsView } from "./views/passive-loads-view";
import {
  bestHeatPumpSimulationResultAtom,
  simulationsAtom,
  statusQuoSimulationResultAtom,
} from "./app-state/simulations-state";
import { systemComparisonAtom } from "./app-state/system-comparison";
import { Paragraphs } from "./views/utils";
import { ComparisonSummary } from "./views/comparison-summary";
import { HomeConfigurationView } from "./views/home-configuration-view";

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
            <HomeConfigurationView />
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
        <ComparisonSummary />
        {simulations &&
        naturalGasPricePerCubicMetre != null &&
        electricityPricePerKwh != null ? (
          <>
            {/* Advanced views that we'll hide for now
              <EquipmentEfficiencyView />
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
              <p>
                First, we retrieve location-specific historical hourly weather
                data for all of 2023.
              </p>
            </Paragraphs>
            <TemperaturesView
              heatingSetPointC={heatingSetPointC}
              coolingSetPointC={coolingSetPointC}
              simulationResult={simulations[0]}
            />
            <Paragraphs>
              <p>
                Now we run a simulation. At each point in time, we use weather
                information and the simulated temperature inside the house to
                calculate the thermal loads on the house.
              </p>
            </Paragraphs>
            <PassiveLoadsView simulationResult={simulations[0]} />
            <Paragraphs>
              <p>
                Using a simulated thermostat, the simulation turns heating and
                cooling appliances on and off. The passive thermal loads on the
                house and the thermal loads from the heating and cooling
                appliances are then used to update the internal air temperature.
              </p>
              <p>
                As we&rsquo;re recording appliances turning on and off, we
                record how much energy they&rsquo;re using. We use provincial
                gas and electricity prices from 2023 to estimate costs.
              </p>
            </Paragraphs>
            <BillingView
              simulations={simulations}
              pricePerCubicMetre={naturalGasPricePerCubicMetre}
              pricePerKwh={electricityPricePerKwh}
            />
            <Paragraphs>
              <p>
                Once we have the total energy usage for the year, we can
                calculate emissions information using regional information on
                the carbon intensity of the electrical grid.
              </p>
            </Paragraphs>
          </>
        ) : (
          <Box height={"1400px"} />
        )}
        {/* TODO(jlfwong): Loading animation graphic instead of the 1400px box */}
      </Flex>
    </Center>
  );
};
