import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import React, { useEffect, useRef } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  airConditionerInstallCostAtom,
  electricFurnaceInstallCostAtom,
  floorSpaceSqFtAtom,
  gasFurnaceInstallCostAtom,
  hasOtherGasAppliancesAtom,
  heatpumpBackupFuelAtom,
  heatpumpInstallCostAtom,
  postalCodeAtom,
  statusQuoFurnaceFuelAtom,
} from "../app-state/config-state";
import { FormRow, FormSelect } from "./forms";
import { NumericFormInputView } from "./forms";
import { FormSectionView } from "./forms";

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
  const [heatpumpInstallCost, setHeatpumpInstallCost] = useAtom(
    heatpumpInstallCostAtom
  );
  const [gasFurnaceInstallCost, setGasFurnaceInstallCost] = useAtom(
    gasFurnaceInstallCostAtom
  );
  const [electricFurnaceInstallCost, setElectricFurnaceInstallCost] = useAtom(
    electricFurnaceInstallCostAtom
  );
  const statusQuoFurnaceFuel = useAtomValue(statusQuoFurnaceFuelAtom);

  const [airConditionerInstallCost, setAirConditionerInstallCost] = useAtom(
    airConditionerInstallCostAtom
  );

  const [heatpumpBackupFuel, setHeatpumpBackupFuel] = useAtom(
    heatpumpBackupFuelAtom
  );

  let furnaceCost: number;
  let setFurnaceCost: (cost: number) => void;

  switch (statusQuoFurnaceFuel) {
    case "electric": {
      furnaceCost = electricFurnaceInstallCost;
      setFurnaceCost = setElectricFurnaceInstallCost;
      break;
    }

    case "gas": {
      furnaceCost = gasFurnaceInstallCost;
      setFurnaceCost = setGasFurnaceInstallCost;
      break;
    }

    default: {
      assertNever(statusQuoFurnaceFuel);
    }
  }

  return (
    <FormSectionView title="Equipment purchase & installation costs">
      <FormRow>
        <NumericFormInputView
          label="New heat pump w/ backup"
          value={heatpumpInstallCost}
          prefix="$"
          setValue={setHeatpumpInstallCost}
          minValue={0}
          step={1000}
          maxValue={100000}
        />
        <FormSelect
          label="Backup heat source"
          value={heatpumpBackupFuel}
          onChange={(ev) => {
            setHeatpumpBackupFuel(ev.currentTarget.value as "gas" | "electric");
          }}
        >
          <option value="gas">Gas</option>
          <option value="electric">Electric</option>
        </FormSelect>
      </FormRow>
      <DividerWithLabel label={"Compare to"} />
      <FormRow>
        <NumericFormInputView
          label={`New ${statusQuoFurnaceFuel} furnace`}
          value={furnaceCost}
          prefix="$"
          setValue={setFurnaceCost}
          minValue={0}
          step={1000}
          maxValue={100000}
        />
        <NumericFormInputView
          label={`New air conditioner`}
          value={airConditionerInstallCost}
          prefix="$"
          setValue={setAirConditionerInstallCost}
          minValue={0}
          step={1000}
          maxValue={100000}
        />
      </FormRow>
    </FormSectionView>
  );
};
