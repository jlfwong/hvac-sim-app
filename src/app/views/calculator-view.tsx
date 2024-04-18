import React from "react";
import {
  Flex,
  HStack,
  Heading,
  VStack,
  useBreakpointValue,
} from "@chakra-ui/react";
import {
  CardColumnStackView,
  CardStackView,
  LifetimeCostsCardView,
  EmissionsReductionCardView,
  UtilityBillsCardView,
  AboutThisCalculatorCardView,
  GasServiceFixedCostsCardView,
  LoadingCardView,
} from "./cards";
import { EquipmentPurchaseAndInstallFormSectionView } from "./equipment-purchase-and-install-form-section-view";
import { UtilityPricesFormSectionView } from "./utility-prices-form-section-view";
import { ThermostatFormSectionView } from "./thermostat-form-section-view";
import { statusQuoFurnaceFuelAtom } from "../app-state/config-state";
import { useAtomValue } from "jotai";
import { systemComparisonAtom } from "../app-state/system-comparison";
import { FormSectionView, FormRow } from "./forms";
import {
  PostalCodeInput,
  FloorSpaceInput,
  OtherGasAppliancesSelect,
} from "./inputs";

export const CalculatorView: React.FC = () => {
  const statusQuoFurnaceFuel = useAtomValue(statusQuoFurnaceFuelAtom);
  const systemComparison = useAtomValue(systemComparisonAtom);

  const isLoading = systemComparison == null;

  const columns = useBreakpointValue(
    {
      base: 1,
      md: 2,
      lg: 3,
    },
    { ssr: false }
  );

  let column1: React.ReactNode[] = [];
  let column2: React.ReactNode[] = [];

  if (isLoading) {
    column1.push(<LoadingCardView height={400} />);
    column2.push(<LoadingCardView height={300} />);
    column1.push(<LoadingCardView height={300} />);
    column2.push(<LoadingCardView height={200} />);
  } else {
    if (columns == null || columns < 3) {
      column2 = column1;
    }
    column1.push(<LifetimeCostsCardView key={"life"} />);
    column2.push(<EmissionsReductionCardView key={"emissions"} />);
    column1.push(<UtilityBillsCardView key={"utility-bills"} />);

    if (statusQuoFurnaceFuel === "gas") {
      column2.push(<GasServiceFixedCostsCardView key={"gas-service"} />);
    }
    column2.push(<AboutThisCalculatorCardView key={"about"} />);
  }

  let formSections: React.ReactNode[] = [
    <FormSectionView title="About your home" key={"about-your-home"}>
      <FormRow>
        <PostalCodeInput />
        <FloorSpaceInput />
      </FormRow>
      <OtherGasAppliancesSelect />
    </FormSectionView>,
    <EquipmentPurchaseAndInstallFormSectionView key={"equipment"} />,
  ];

  if (columns == null || columns > 1) {
    formSections.push(
      <UtilityPricesFormSectionView key={"utilityprices"} />,
      <ThermostatFormSectionView key={"thermostat"} />
    );
  }

  if (columns === 3) {
    return (
      <Flex direction="row" w="full">
        <Flex direction="column" h="full" w={"400px"} p="20px" gap="20px">
          <Heading textAlign={"center"}>Heat Pump Calculator 🇨🇦</Heading>
          {formSections}
        </Flex>
        <CardColumnStackView>
          <CardStackView>{column1}</CardStackView>
          <CardStackView>{column2}</CardStackView>
        </CardColumnStackView>
      </Flex>
    );
  } else if (columns === 2) {
    return (
      <Flex direction="row" w="full">
        <Flex direction="column" h="full" w={"400px"} p="20px" gap="20px">
          <Heading textAlign={"center"}>Heat Pump Calculator 🇨🇦</Heading>
          {formSections}
        </Flex>
        <CardColumnStackView>
          <CardStackView>{column1}</CardStackView>
        </CardColumnStackView>
      </Flex>
    );
  } else {
    return (
      <VStack gap="20px" w="full">
        <Heading textAlign={"center"}>Heat Pump Calculator 🇨🇦</Heading>
        {formSections}
        {column1}
      </VStack>
    );
  }
};
