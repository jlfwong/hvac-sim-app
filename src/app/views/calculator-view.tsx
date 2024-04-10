import React from "react";
import {
  Flex,
  HStack,
  Heading,
  VStack,
  useBreakpointValue,
} from "@chakra-ui/react";
import { AboutYourHomeFormSectionView } from "./about-your-home-form-section-view";
import {
  CardColumnStackView,
  CardStackView,
  LifetimeCostsCardView,
  EmissionsReductionCardView,
  EnergyUseSavingsCardView,
  AboutThisCalculatorCardView,
} from "./cards";
import { EquipmentPurchaseAndInstallFormSectionView } from "./equipment-purchase-and-install-form-section-view";
import { UtilityPricesFormSectionView } from "./utility-prices-form-section-view";

export const CalculatorView: React.FC = () => {
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

  if (columns == null || columns < 3) {
    column2 = column1;
  }
  column1.push(<LifetimeCostsCardView key={"life"} />);
  column2.push(<EmissionsReductionCardView key={"emissions"} />);
  column1.push(<EnergyUseSavingsCardView key={"energy"} />);
  column2.push(<AboutThisCalculatorCardView key={"about"} />);

  let formSections: React.ReactNode[] = [
    <AboutYourHomeFormSectionView key={"aboutyourhome"} />,
  ];

  if (columns == null || columns > 1) {
    formSections.push(
      <EquipmentPurchaseAndInstallFormSectionView key={"equipment"} />,
      <UtilityPricesFormSectionView key={"utilityprices"} />
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
        <Flex direction="column" h="full" w={"300px"} p="20px" gap="20px">
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
