import React from "react";
import { FormRow, FormSectionView, NumericFormInputView } from "./forms";
import { useAtom } from "jotai";
import {
  electricityPricePerKwhAtom,
  naturalGasPricePerCubicMetreAtom,
} from "../app-state/canadian-utilities-state";

export const UtilityPricesFormSectionView: React.FC = () => {
  const [electricityPricePerKwh, setElectricityPricePerKwh] = useAtom(
    electricityPricePerKwhAtom
  );
  const [naturalGasPricePerCubicMetre, setNaturalGasPricePerCubicMetre] =
    useAtom(naturalGasPricePerCubicMetreAtom);

  if (electricityPricePerKwh == null || naturalGasPricePerCubicMetre == null) {
    return null;
  }

  return (
    <FormSectionView title="Utility prices">
      <FormRow>
        <NumericFormInputView
          label="Electricity"
          minValue={0}
          maxValue={100}
          step={0.01}
          value={electricityPricePerKwh}
          setValue={setElectricityPricePerKwh}
          textAlign={"right"}
          suffix="$/kWh"
        />
        <NumericFormInputView
          label="Natural Gas"
          minValue={0}
          maxValue={100}
          step={0.01}
          value={naturalGasPricePerCubicMetre}
          setValue={setNaturalGasPricePerCubicMetre}
          textAlign={"right"}
          suffix={
            <>
              $/m<sup>3</sup>
            </>
          }
        />
      </FormRow>
    </FormSectionView>
  );
};
