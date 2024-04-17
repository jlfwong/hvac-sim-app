import React from "react";
import { FormRow, FormSectionView, NumericFormInputView } from "./forms";
import { useAtom, useAtomValue } from "jotai";
import {
  auxSwitchoverTempCAtom,
  coolingSetPointCAtom,
  heatingSetPointCAtom,
  heatpumpBackupFuelAtom,
} from "../app-state/config-state";

export const ThermostatFormSectionView: React.FC = () => {
  const [heatingSetPointC, setHeatingSetPointC] = useAtom(heatingSetPointCAtom);
  const [coolingSetPointC, setCoolingSetPointC] = useAtom(coolingSetPointCAtom);

  return (
    <FormSectionView title="Thermostat settings">
      <FormRow>
        <NumericFormInputView
          label="Heat to…"
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
