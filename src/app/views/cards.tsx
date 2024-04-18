import React from "react";
import {
  Text,
  HStack,
  Heading,
  VStack,
  Link,
  Box,
  keyframes,
  type StackProps,
} from "@chakra-ui/react";
import { useAtomValue } from "jotai";
import { systemComparisonAtom } from "../app-state/system-comparison";
import {
  coolingSetPointCAtom,
  hasOtherGasAppliancesAtom,
  heatingSetPointCAtom,
  heatpumpBackupFuelAtom,
  statusQuoFurnaceFuelAtom,
} from "../app-state/config-state";
import { LifetimeCostOfOwnershipView } from "./lifetime-cost-of-ownership-view";
import { EmissionsView } from "./emissions-view";
import { BillingView } from "./monthly-billing-view";
import { simplePlaceNameAtom } from "../app-state/canadian-weather-state";
import {
  electricityPricePerKwhAtom,
  naturalGasFixedPricePerMonthAtom,
  naturalGasPricePerCubicMetreAtom,
} from "../app-state/canadian-utilities-state";
import { bestHeatPumpSimulationResultAtom } from "../app-state/simulations-state";
import { TemperaturesView } from "./temperatures-view";

interface InfoCardViewProps {
  title: string;
  children: React.ReactNode;
}

const InfoCardView: React.FC<InfoCardViewProps & StackProps> = ({
  title,
  children,
  ...props
}) => {
  return (
    <VStack
      w="full"
      bg="white"
      borderRadius={"10px"}
      p={{ base: "5px", md: "20px" }}
      gap={"5px"}
      align="start"
      {...props}
    >
      <Text textTransform="uppercase">{title}</Text>
      {children}
    </VStack>
  );
};

export const LoadingCardView: React.FC<{ height: number }> = (props) => {
  return (
    <InfoCardView title="">
      <Box w="full" height={`${props.height}px`} />
    </InfoCardView>
  );
};

export const CardColumnStackView: React.FC<{ children: React.ReactNode }> = (
  props
) => {
  return (
    <HStack flex="1" p="20px" bg="#E7E7E7" gap="20px" align="start">
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

export const UtilityBillsCardView: React.FC = () => {
  const systemComparison = useAtomValue(systemComparisonAtom);
  const simplePlaceName = useAtomValue(simplePlaceNameAtom);
  const naturalGasPricePerCubicMetre = useAtomValue(
    naturalGasPricePerCubicMetreAtom
  );
  const electricityPricePerKwh = useAtomValue(electricityPricePerKwhAtom);

  if (!systemComparison || !simplePlaceName) return null;

  const costSavings = systemComparison.annualOpexCostSavings;

  let heading = formatDollars(Math.abs(costSavings));
  if (costSavings < 0) {
    heading += " more";
  } else {
    heading += " less";
  }
  heading += " per year";

  return (
    <InfoCardView title={"Utility Bills"}>
      <Heading>{heading}</Heading>
      <Text>
        Based on weather data from {simplePlaceName} and utility prices of $
        {electricityPricePerKwh}/kWh for electricity and $
        {naturalGasPricePerCubicMetre}/m<sup>3</sup> for natural gas.
      </Text>
      <BillingView />
    </InfoCardView>
  );
};

export const GasServiceFixedCostsCardView: React.FC = () => {
  // TODO(jlfwong): Fix loading patterns so this card doesn't show up on its own
  const naturalGasFixedCostPerMonth = useAtomValue(
    naturalGasFixedPricePerMonthAtom
  );

  const heatpumpBackupFuel = useAtomValue(heatpumpBackupFuelAtom);
  const hasOtherGasAppliances = useAtomValue(hasOtherGasAppliancesAtom);

  if (naturalGasFixedCostPerMonth == null) return null;

  const reasonsPreventingCancellation: string[] = [];

  if (heatpumpBackupFuel === "gas") {
    reasonsPreventingCancellation.push(
      "You've selected a heatpump using a gas furnace as its backup heat source"
    );
  }
  if (hasOtherGasAppliances) {
    reasonsPreventingCancellation.push("Your house has other gas appliances");
  }

  return (
    <InfoCardView title={"Annual Gas Service Fee"}>
      <Heading>
        {formatDollars(naturalGasFixedCostPerMonth * 12)} per year
      </Heading>
      <Text>
        This is how much you could save per year if you cancel your gas service
        entirely. Gas utilities in your area charge a fixed fee of around{" "}
        {formatDollars(naturalGasFixedCostPerMonth)}/month on top of usage
        charges.
      </Text>
      {reasonsPreventingCancellation.length > 0 ? (
        <>
          <Text>
            The utility bills for the heat pump shown in this calculator still
            contain this charge because…
          </Text>
          <Box as="ul" ml="2em">
            {reasonsPreventingCancellation.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </Box>
          <Text>
            If you replace all gas appliances and fully electrify your home,
            then you'd be able to cancel your gas service and benefit from these
            savings.
          </Text>
        </>
      ) : (
        <Text>
          Since you've chosen a fully electric heat pump, and your home has no
          other gas appliances, the utility bills for the heat pump shown in
          this calculator reflect the savings from cancelling this service.
        </Text>
      )}
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