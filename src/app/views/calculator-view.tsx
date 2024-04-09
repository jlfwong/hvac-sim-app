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
  LifetimeSavingsCardView,
  EmissionsReductionCardView,
  EnergyUseSavingsCardView,
} from "./cards";

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
  column1.push(<LifetimeSavingsCardView key={"life"} />);
  column2.push(<EmissionsReductionCardView key={"emissions"} />);
  column1.push(<EnergyUseSavingsCardView key={"energy"} />);

  if (columns === 3) {
    return (
      <Flex direction="row" w="full">
        <Flex direction="column" h="full" w={"400px"} p="20px" gap="20px">
          <Heading textAlign={"center"}>Heat Pump Calculator 🇨🇦</Heading>
          <AboutYourHomeFormSectionView />
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
          <AboutYourHomeFormSectionView />
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
        <AboutYourHomeFormSectionView />
        {column1}
      </VStack>
    );
  }
};
