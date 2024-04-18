import React from "react";
import { FormRow, FormSectionView, NumericFormInputView } from "./forms";
import { useAtom } from "jotai";
import {
  electricityPricePerKwhAtom,
  naturalGasPricePerCubicMetreAtom,
} from "../app-state/canadian-utilities-state";
import { Stack } from "@chakra-ui/react";

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
          tooltip={
            <Stack>
              <p>
                This assumes a single variable cost, without time-of-use
                pricing. The values here are based on provincial averages for
                2023.
              </p>
              <p>
                Try changing this value to see how sensitive the lifetime costs
                are to utility rates.
              </p>
            </Stack>
          }
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
          tooltip={
            <p>
              This includes all variable costs (transport, delivery, carbon tax,
              etc.), but does not include the fixed monthly "Customer Charge".
              The values here are based on provincial averages for 2023.
            </p>
          }
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
