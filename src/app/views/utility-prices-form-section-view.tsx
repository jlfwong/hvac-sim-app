import React from "react";
import { FormRow, FormSectionView, NumericFormInputView } from "./forms";
import { useAtom, useAtomValue } from "jotai";
import {
  electricityPricePerKwhAtom,
  naturalGasPricePerCubicMetreAtom,
} from "../app-state/canadian-utilities-state";
import { Stack } from "@chakra-ui/react";
import { ElectricityPriceInput, NaturalGasPriceInput } from "./inputs";

export const UtilityPricesFormSectionView: React.FC = () => {
  const electricityPricePerKwh = useAtomValue(electricityPricePerKwhAtom);
  if (electricityPricePerKwh == null) {
    // Without this, the form section view might render without the utility
    // price inputs
    return null;
  }

  return (
    <FormSectionView title="Utility prices">
      <FormRow>
        <ElectricityPriceInput />
        <NaturalGasPriceInput />
      </FormRow>
    </FormSectionView>
  );
};
