import { useAtom, useAtomValue } from "jotai";
import {
  heatpumpInstallCostAtom,
  heatpumpBackupFuelAtom,
  airConditionerInstallCostAtom,
  statusQuoFurnaceFuelAtom,
  gasFurnaceInstallCostAtom,
  electricFurnaceInstallCostAtom,
  floorSpaceSqFtAtom,
  hasOtherGasAppliancesAtom,
  postalCodeAtom,
} from "../app-state/config-state";
import { NumericFormInputView, FormSelect, FormInput } from "./forms";
import React, { useEffect, useRef } from "react";

export const HeatPumpInstallCostInput: React.FC = () => {
  const [heatpumpInstallCost, setHeatpumpInstallCost] = useAtom(
    heatpumpInstallCostAtom
  );
  return (
    <NumericFormInputView
      label="New heat pump w/ backup"
      value={heatpumpInstallCost}
      prefix="$"
      setValue={setHeatpumpInstallCost}
      minValue={0}
      step={1000}
      maxValue={100000}
    />
  );
};

export const HeatPumpBackupFuelSelect: React.FC = () => {
  const [heatpumpBackupFuel, setHeatpumpBackupFuel] = useAtom(
    heatpumpBackupFuelAtom
  );
  return (
    <FormSelect
      label="Backup heat source"
      value={heatpumpBackupFuel}
      onChange={(ev) =>
        setHeatpumpBackupFuel(ev.currentTarget.value as "gas" | "electric")
      }
    >
      <option value="gas">Gas</option>
      <option value="electric">Electric</option>
    </FormSelect>
  );
};

export const AirConditionerInstallCostInput: React.FC = () => {
  const [airConditionerInstallCost, setAirConditionerInstallCost] = useAtom(
    airConditionerInstallCostAtom
  );
  return (
    <NumericFormInputView
      label="New air conditioner"
      value={airConditionerInstallCost}
      prefix="$"
      setValue={setAirConditionerInstallCost}
      minValue={0}
      step={1000}
      maxValue={100000}
    />
  );
};

export const FurnaceInstallCostInput: React.FC = () => {
  const statusQuoFurnaceFuel = useAtomValue(statusQuoFurnaceFuelAtom);
  const [gasFurnaceInstallCost, setGasFurnaceInstallCost] = useAtom(
    gasFurnaceInstallCostAtom
  );
  const [electricFurnaceInstallCost, setElectricFurnaceInstallCost] = useAtom(
    electricFurnaceInstallCostAtom
  );

  let furnaceCost: number;
  let setFurnaceCost: (cost: number) => void;

  switch (statusQuoFurnaceFuel) {
    case "electric":
      furnaceCost = electricFurnaceInstallCost;
      setFurnaceCost = setElectricFurnaceInstallCost;
      break;
    case "gas":
      furnaceCost = gasFurnaceInstallCost;
      setFurnaceCost = setGasFurnaceInstallCost;
      break;
    default:
      assertNever(statusQuoFurnaceFuel);
  }

  return (
    <NumericFormInputView
      label={`New ${statusQuoFurnaceFuel} furnace`}
      value={furnaceCost}
      prefix="$"
      setValue={setFurnaceCost}
      minValue={0}
      step={1000}
      maxValue={100000}
    />
  );
};
export const PostalCodeInput: React.FC = () => {
  const [postalCode, setPostalCode] = useAtom(postalCodeAtom);
  const postalCodeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Automatically focus the input if postal code is un-set, on mount
    if (!postalCode) {
      postalCodeInputRef.current?.focus();
    }
  }, [postalCode]);

  return (
    <FormInput
      label="Postal code"
      placeholder="K2A 2Y3"
      value={postalCode ?? ""}
      onChange={(ev) => setPostalCode(ev.currentTarget.value)}
      ref={postalCodeInputRef}
    />
  );
};

export const FloorSpaceInput: React.FC = () => {
  const [floorSpaceSqFt, setFloorSpaceSqFt] = useAtom(floorSpaceSqFtAtom);

  return (
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
  );
};

export const HomeHeatingTypeSelect: React.FC<{ label: string }> = (props) => {
  const [statusQuoFurnaceFuel, setStatusQuoFurnaceFuel] = useAtom(
    statusQuoFurnaceFuelAtom
  );

  return (
    <FormSelect
      label={props.label}
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
  );
};

export const OtherGasAppliancesSelect: React.FC = () => {
  const [hasOtherGasAppliances, setHasOtherGasAppliances] = useAtom(
    hasOtherGasAppliancesAtom
  );

  return (
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
  );
};
