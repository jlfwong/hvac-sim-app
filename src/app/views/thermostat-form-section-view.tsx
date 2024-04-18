import React from "react";
import { FormRow, FormSectionView, NumericFormInputView } from "./forms";
import { useAtom, useAtomValue } from "jotai";
import {
  auxSwitchoverTempCAtom,
  coolingSetPointCAtom,
  heatingSetPointCAtom,
  heatpumpBackupFuelAtom,
} from "../app-state/config-state";
import { Stack } from "@chakra-ui/react";

export const ThermostatFormSectionView: React.FC = () => {
  const [heatingSetPointC, setHeatingSetPointC] = useAtom(heatingSetPointCAtom);
  const [coolingSetPointC, setCoolingSetPointC] = useAtom(coolingSetPointCAtom);

  return (
    <FormSectionView title="Thermostat settings">
      <FormRow>
        <NumericFormInputView
          label="Heat to…"
          tooltip={
            <Stack>
              <p>
                This is the "heating set point". When your home's temperature
                drops below this value by too much, your heating equipment
                (heatpump or furnace) will be turned on until the temperature is
                comfortably above this value.
              </p>
              <p>
                Higher values will use more energy, costing you more money, and
                emitting more greenhouse gases.
              </p>
            </Stack>
          }
          minValue={0}
          maxValue={40}
          step={1}
          value={heatingSetPointC}
          setValue={setHeatingSetPointC}
          textAlign={"right"}
          suffix="°C"
        />
        <NumericFormInputView
          label="Cool to…"
          tooltip={
            <Stack>
              <p>
                This is the "cooling set point". When your home's temperature
                rises past this value by too much, your cooling equipment
                (heatpump or air conditioner) will be turned on until the
                temperature is comfortably above this value.
              </p>
              <p>
                Lower values will use more energy, costing you more money, and
                emitting more greenhouse gases.
              </p>
            </Stack>
          }
          minValue={0}
          maxValue={40}
          step={1}
          value={coolingSetPointC}
          setValue={setCoolingSetPointC}
          textAlign={"right"}
          suffix="°C"
        />
      </FormRow>
    </FormSectionView>
  );
};
