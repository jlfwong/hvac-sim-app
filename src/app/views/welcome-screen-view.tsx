import {
  Box,
  Button,
  Center,
  Flex,
  Heading,
  Link,
  Stack,
} from "@chakra-ui/react";
import React from "react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  floorSpaceSqFtAtom,
  postalCodeAtom,
  welcomeFormHasBeenSubmitAtom,
} from "../app-state/config-state";
import { locationInfoAtom } from "../app-state/canadian-weather-state";
import { buildingGeometryAtom } from "../app-state/loads-state";
import { FormSectionView, FormRow } from "./forms";
import {
  PostalCodeInput,
  FloorSpaceInput,
  HomeHeatingTypeSelect,
  OtherGasAppliancesSelect,
} from "./inputs";

const WelcomeFormView: React.FC = () => {
  const setWelcomeFormHasBeenSubmit = useSetAtom(welcomeFormHasBeenSubmitAtom);
  const locationInfo = useAtomValue(locationInfoAtom);
  const buildingGeometry = useAtomValue(buildingGeometryAtom);

  return (
    <Box maxW="1280px" p={{ base: 0, md: "20px" }} borderRadius="md">
      <Stack spacing={"20px"}>
        <FormSectionView title="About your home">
          <FormRow>
            <PostalCodeInput />
            <FloorSpaceInput />
          </FormRow>
          <HomeHeatingTypeSelect
            label="My home is heated with"
            tooltip={
              <Stack>
                <p>
                  We'll compare the costs for a heatpump against the costs for
                  replacing the equipment you already have with something
                  similar.
                </p>
                <p>
                  If you have a gas furnace, choose "gas". If you baseboard
                  heaters or an electric furnace, choose "electricity".
                </p>
              </Stack>
            }
          />
          <OtherGasAppliancesSelect />
        </FormSectionView>
        <Button
          colorScheme="blue"
          w="full"
          mt="4"
          isDisabled={locationInfo == null || buildingGeometry == null}
          onClick={() => {
            setWelcomeFormHasBeenSubmit(true);
          }}
        >
          Estimate Costs & Emissions
        </Button>
      </Stack>
    </Box>
  );
};
const LocationLink: React.FC<{
  postalCode: string;
  placeName: string;
}> = (props) => {
  const setPostalCode = useSetAtom(postalCodeAtom);
  const setFloorSpaceSqFt = useSetAtom(floorSpaceSqFtAtom);
  const setWelcomeFormHasBeenSubmit = useSetAtom(welcomeFormHasBeenSubmitAtom);

  const onClick: React.EventHandler<React.MouseEvent> = (ev) => {
    setPostalCode(props.postalCode);
    setFloorSpaceSqFt(2000);
    setWelcomeFormHasBeenSubmit(true);
    ev.preventDefault();
  };

  return (
    <Box as="a" href="#" onClick={onClick} textDecoration={"underline"}>
      {props.placeName} ({props.postalCode})
    </Box>
  );
};
const WelcomeMessage: React.FC<{}> = () => {
  return (
    <Center h="full">
      <Stack spacing={"30px"} maxW="400px">
        <p>
          This is an interactive tool to help you understand the tradeoffs
          involved with replacing your heating and cooling equipment with a heat
          pump in Canada.
        </p>
        <p>
          <strong>
            Enter your home’s information to get an instant cost estimate.
          </strong>
        </p>
        <p>If you’d like to see examples, click the links below:</p>
        <Flex direction="row" w="full" mt={"-20px"}>
          <Box flex={1}>
            <Center>
              <ul>
                <li>
                  <LocationLink postalCode="M5V 0H8" placeName="Toronto" />
                </li>
                <li>
                  <LocationLink postalCode="H3H 2H9" placeName="Montreal" />
                </li>
                <li>
                  <LocationLink postalCode="V5K 0A1" placeName="Vancouver" />
                </li>
                <li>
                  <LocationLink postalCode="T2P 0A9" placeName="Calgary" />
                </li>
              </ul>
            </Center>
          </Box>
          <Box flex={1}>
            <Center>
              <ul>
                <li>
                  <LocationLink postalCode="T6G 2R3" placeName="Edmonton" />
                </li>
                <li>
                  <LocationLink postalCode="K2A 2Y3" placeName="Ottawa" />
                </li>
                <li>
                  <LocationLink postalCode="R3T 2N2" placeName="Winnipeg" />
                </li>
                <li>
                  <LocationLink postalCode="G1R 1R5" placeName="Quebec City" />
                </li>
              </ul>
            </Center>
          </Box>
        </Flex>
        <p>
          If you're curious about the methodology, you can{" "}
          <Link
            href="https://github.com/jlfwong/hvac-sim-app?tab=readme-ov-file#how-does-it-work"
            textDecoration={"underline"}
          >
            read about it here
          </Link>
          . You can also{" "}
          <Link
            href="https://github.com/jlfwong/hvac-sim-app"
            textDecoration={"underline"}
          >
            read the source code
          </Link>
          .
        </p>
      </Stack>
    </Center>
  );
};
export const WelcomeScreenView: React.FC<{}> = () => {
  return (
    <Center h="100vh" w="full">
      <Flex direction={{ base: "column", md: "row" }} gap={"40px"}>
        <Stack>
          <Heading textAlign={"center"}>Heat Pump Calculator 🇨🇦</Heading>
          <WelcomeFormView />
        </Stack>
        <WelcomeMessage />
      </Flex>
    </Center>
  );
};
