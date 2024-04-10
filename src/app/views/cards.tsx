import React from "react";
import { Text, HStack, Heading, VStack, Link } from "@chakra-ui/react";
import { useAtomValue } from "jotai";
import { systemComparisonAtom } from "../app-state/system-comparison";
import {
  coolingSetPointCAtom,
  heatingSetPointCAtom,
  statusQuoFurnaceFuelAtom,
} from "../app-state/config-state";
import { LifetimeCostOfOwnershipView } from "./lifetime-cost-of-ownership-view";
import { EmissionsView } from "./emissions-view";
import { BillingView } from "./monthly-billing-view";
import { locationInfoAtom } from "../app-state/canadian-weather-state";
import {
  electricityPricePerKwhAtom,
  naturalGasPricePerCubicMetreAtom,
} from "../app-state/canadian-utilities-state";
import { bestHeatPumpSimulationResultAtom } from "../app-state/simulations-state";
import { TemperaturesView } from "./temperatures-view";

interface InfoCardViewProps {
  title: string;
  children: React.ReactNode;
}
const InfoCardView: React.FC<InfoCardViewProps> = (props) => {
  return (
    <VStack
      w="full"
      bg="white"
      borderRadius={"10px"}
      p="20px"
      gap={"5px"}
      align="start"
    >
      <Text textTransform="uppercase">{props.title}</Text>
      {props.children}
    </VStack>
  );
};
export const CardColumnStackView: React.FC<{ children: React.ReactNode }> = (
  props
) => {
  return (
    <HStack flex="1" p="20px" bg="gray.50" gap="20px" align="start">
      {props.children}
    </HStack>
  );
};
export const CardStackView: React.FC<{ children: React.ReactNode }> = (
  props
) => {
  return (
    <VStack gap="20px" flex="1">
      {props.children}
    </VStack>
  );
};
function sigDigs(num: number, digits: number = 1) {
  return num.toLocaleString("en-CA", { maximumSignificantDigits: digits });
}
function formatDollars(num: number) {
  return (num < 0 ? "-$" : "$") + sigDigs(Math.abs(num), 2);
}
export const LifetimeCostsCardView: React.FC = () => {
  const systemComparison = useAtomValue(systemComparisonAtom);
  const statusQuoFurnaceFuel = useAtomValue(statusQuoFurnaceFuelAtom);

  if (!systemComparison) return null;

  const savings = systemComparison.lifetimeCostSavings;

  let heading = formatDollars(Math.abs(savings));
  if (savings < 0) {
    heading += " more";
  } else {
    heading += " less";
  }
  heading += " over 15 years";

  let message = "Installing a heat pump could";
  if (savings < 0) {
    message += ` cost you ${formatDollars(Math.abs(savings))} more than`;
  } else {
    message += ` save you ${formatDollars(Math.abs(savings))} compared to`;
  }
  if (statusQuoFurnaceFuel === "gas") {
    message += ` a gas furnace`;
  } else if (statusQuoFurnaceFuel === "electric") {
    message += ` an electric furnace`;
  } else {
    assertNever(statusQuoFurnaceFuel);
  }
  message += " and an air conditioner over the lifetime of the equipment.";
  message += " This takes into account both up-front costs and utility bills.";

  return (
    <InfoCardView title={"Lifetime Costs"}>
      <Heading>{heading}</Heading>
      <Text>{message}</Text>
      <LifetimeCostOfOwnershipView />
    </InfoCardView>
  );
};
// Round trip flight emissions estimated using Google Flights
const emissionsGramsCO2eRoundTripFlight = 275000 + 275000;
export const EmissionsReductionCardView: React.FC = () => {
  const systemComparison = useAtomValue(systemComparisonAtom);

  if (!systemComparison) return null;

  const savings = systemComparison.annualEmissionsSavingGramsCo2e;

  let heading: React.ReactNode = (
    <>
      {sigDigs(Math.abs(savings) / 1e6, 2)} tCO<sub>2</sub>e
      {savings < 0 ? " more" : " less"} per year
    </>
  );

  let message: React.ReactNode;

  if (savings < 0) {
    message = (
      <Text>
        It looks like a heat pump might increase emissions by{" "}
        {sigDigs(-savings / 1e6, 2)} tons per year. This tends to happen in
        areas where electrical power generation has exceptionally high
        emissions.
      </Text>
    );
  } else {
    const flightCount = sigDigs(savings / emissionsGramsCO2eRoundTripFlight);

    message = (
      <Text>
        This is roughly equivalent to {flightCount} round-trip flight
        {flightCount !== "1" ? "s" : ""} between Toronto and Vancouver. This is
        based on province-specific data for the carbon intensity of the
        electrical grid.
      </Text>
    );
  }
  return (
    <InfoCardView title={"Greenhouse Gas Emissions"}>
      <Heading>{heading}</Heading>
      {message}
      <EmissionsView />
    </InfoCardView>
  );
};

export const EnergyUseSavingsCardView: React.FC = () => {
  const systemComparison = useAtomValue(systemComparisonAtom);
  const locationInfo = useAtomValue(locationInfoAtom);
  const naturalGasPricePerCubicMetre = useAtomValue(
    naturalGasPricePerCubicMetreAtom
  );
  const electricityPricePerKwh = useAtomValue(electricityPricePerKwhAtom);

  if (!systemComparison || !locationInfo) return null;

  const costSavings = systemComparison.annualOpexCostSavings;

  let heading = formatDollars(Math.abs(costSavings));
  if (costSavings < 0) {
    heading += " more";
  } else {
    heading += " less";
  }
  heading += " per year";

  return (
    <InfoCardView title={"Energy Costs"}>
      <Heading>{heading}</Heading>
      <Text>
        Based on weather data from {locationInfo.placeName} and utility prices
        of ${naturalGasPricePerCubicMetre}/m<sup>3</sup> of natural gas and $
        {electricityPricePerKwh}/kWh of electricity.
      </Text>
      <BillingView />
      <Text>
        If the monthly estimates look wrong for your house, try adjusting the
        insulation quality and ensure that the calculator's thermostat settings
        match yours.
      </Text>
    </InfoCardView>
  );
};

export const AboutThisCalculatorCardView: React.FC = () => {
  const bestHeatPumpSimulationResult = useAtomValue(
    bestHeatPumpSimulationResultAtom
  );
  const heatingSetPointC = useAtomValue(heatingSetPointCAtom);
  const coolingSetPointC = useAtomValue(coolingSetPointCAtom);

  if (!bestHeatPumpSimulationResult) return null;

  return (
    <InfoCardView title={"About This Calculator"}>
      <Text>
        This calculator uses real historical weather data, and province-specific
        electricity and natural gas prices to simulate monthly utility bills and
        greenhouse gas emissions.
      </Text>
      <TemperaturesView
        heatingSetPointC={heatingSetPointC}
        coolingSetPointC={coolingSetPointC}
        simulationResult={bestHeatPumpSimulationResult}
      />
      <Text>
        For more details,{" "}
        <Link
          href="https://github.com/jlfwong/hvac-sim-app?tab=readme-ov-file#how-does-it-work"
          textDecoration={"underline"}
        >
          read about the simulation method
        </Link>{" "}
        used by this calculator. This calculator is{" "}
        <Link
          href="https://github.com/jlfwong/hvac-sim-app"
          textDecoration={"underline"}
        >
          open source
        </Link>
        .
      </Text>
    </InfoCardView>
  );
};