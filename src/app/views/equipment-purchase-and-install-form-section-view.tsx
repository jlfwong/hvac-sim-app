import { Box, HStack, Text } from "@chakra-ui/react";
import { FormRow } from "./forms";
import { FormSectionView } from "./forms";
import {
  HeatPumpInstallCostInput,
  HeatPumpBackupFuelSelect,
  FurnaceInstallCostInput,
  AirConditionerInstallCostInput,
  HomeHeatingTypeSelect,
  AuxSwitchoverTempInput,
} from "./inputs";
import React from "react";
import { Colors } from "./colors";
import { useAtomValue } from "jotai";
import { heatpumpBackupFuelAtom } from "../app-state/config-state";

const DividerWithLabel: React.FC<{ label: string }> = (props) => {
  const color = "gray.300";
  const padding = "10px";

  return (
    <HStack
      alignItems={"center"}
      paddingLeft={padding}
      paddingRight={padding}
      marginTop={"-5px"}
      marginBottom={"-5px"}
      gap={padding}
    >
      <Box height="0" flex="1" borderBottomWidth={1} borderColor={color} />
      <Text textColor={color} size={"sm"}>
        {props.label}
      </Text>
      <Box height="0" flex="1" borderBottomWidth={1} borderColor={color} />
    </HStack>
  );
};

export const EquipmentPurchaseAndInstallFormSectionView: React.FC = () => {
  const heatpumpBackupFuel = useAtomValue(heatpumpBackupFuelAtom);

  return (
    <>
      <FormSectionView title="Heat pump details" stripeColor={Colors.heatpump}>
        <HeatPumpInstallCostInput />
        <FormRow>
          <HeatPumpBackupFuelSelect />
          {heatpumpBackupFuel == "gas" && <AuxSwitchoverTempInput />}
        </FormRow>
      </FormSectionView>
      <FormSectionView
        title="Compare costs and emissions with…"
        stripeColor={Colors.statusQuo}
      >
        <FormRow>
          <HomeHeatingTypeSelect
            label={"Heating equipment"}
            tooltip={
              <p>
                To compare a heatpump against a gas furnace, choose "gas". To
                compare against baseboard heaters or an electric furnace, choose
                "electricity".
              </p>
            }
          />
          <FurnaceInstallCostInput />
        </FormRow>
        <AirConditionerInstallCostInput />
      </FormSectionView>
    </>
  );
};
