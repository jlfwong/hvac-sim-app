import { Flex } from "@chakra-ui/react";
import React, { useEffect, useRef } from "react";
import { useAtom } from "jotai";
import {
  floorSpaceSqFtAtom,
  hasOtherGasAppliancesAtom,
  postalCodeAtom,
  statusQuoFurnaceFuelAtom,
} from "../app-state/config-state";
import { FormInput, FormRow, FormSelect } from "./forms";
import { NumericFormInputView } from "./forms";
import { FormSectionView } from "./forms";

export const AboutYourHomeFormSectionView: React.FC = () => {
  const [postalCode, setPostalCode] = useAtom(postalCodeAtom);
  const [floorSpaceSqFt, setFloorSpaceSqFt] = useAtom(floorSpaceSqFtAtom);
  const [statusQuoFurnaceFuel, setStatusQuoFurnaceFuel] = useAtom(
    statusQuoFurnaceFuelAtom
  );
  const [hasOtherGasAppliances, setHasOtherGasAppliances] = useAtom(
    hasOtherGasAppliancesAtom
  );

  const postalCodeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // If postal code is un-set, automatically focus the input on mount
    if (postalCode == null || postalCode.length === 0) {
      postalCodeInputRef.current?.focus();
    }
  }, []);

  return (
    <FormSectionView title="About your home">
      <FormRow>
        <FormInput
          label="Postal code"
          placeholder="K2A 2Y3"
          value={postalCode ?? ""}
          onChange={(ev) => setPostalCode(ev.currentTarget.value)}
          ref={postalCodeInputRef}
        />
        <NumericFormInputView
          label="Square footage"
          placeholder="2500"
          minValue={100}
          maxValue={100000}
          value={floorSpaceSqFt}
          setValue={setFloorSpaceSqFt}
          textAlign={"right"}
          suffix={
            <>
              ft<sup>2</sup>
            </>
          }
        />
      </FormRow>
      <FormSelect
        label="My furnace (or boiler) uses"
        value={statusQuoFurnaceFuel}
        onChange={(ev) => {
          const value = ev.currentTarget.value;
          if (value === "gas" || value === "electric") {
            setStatusQuoFurnaceFuel(value);
          }
        }}
      >
        <option value="gas">Gas</option>
        <option value="electric">Electricity</option>
      </FormSelect>
      <FormSelect
        label="Other gas appliances (stove, water heater, etc.)"
        value={hasOtherGasAppliances.toString()}
        onChange={(ev) => {
          const value = ev.currentTarget.value;
          setHasOtherGasAppliances(value === "true");
        }}
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
      </FormSelect>
    </FormSectionView>
  );
};
