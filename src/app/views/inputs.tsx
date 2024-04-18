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
  auxSwitchoverTempCAtom,
} from "../app-state/config-state";
import { NumericFormInputView, FormSelect, FormInput } from "./forms";
import React, { useEffect, useRef } from "react";
import { Stack } from "@chakra-ui/react";

export const HeatPumpInstallCostInput: React.FC = () => {
  const [heatpumpInstallCost, setHeatpumpInstallCost] = useAtom(
    heatpumpInstallCostAtom
  );
  return (
    <NumericFormInputView
      label="New heat pump w/ backup"
      tooltip={
        <Stack>
          <p>
            This is the cost to purchase and install a heat pump, including its
            backup heat source. The default values are based on a rough national
            estimate.
          </p>
          <p>
            If you have a real quote from a contractor, replace this value with
            that quote.
          </p>
        </Stack>
      }
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
      tooltip={
        <Stack>
          <p>
            Canada's cold climate will require your heat pump has a backup heat
            source. This is either an electric heating coil or a gas furnace
            that's used in conjunction with the heat pump when it's very cold.
          </p>
          <p>
            For electric backups, smart thermostats will automatically turn on
            the electric backup when the heat pump isn't able to maintain a
            comfortable indoor temperature.
          </p>
          <p>
            For gas backups, the switchover temperature is configured manually
            to allow owners to balance cost and emissions.
          </p>
        </Stack>
      }
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
      tooltip={
        <Stack>
          <p>The purchase and install cost for a new air conditioner.</p>
          <p>
            A heat pump can heat <em>and</em> cool your home, so a heat pump
            replaces your heating and cooling equipment.
          </p>
        </Stack>
      }
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
      tooltip={<>The purchase and install cost for a new furnace.</>}
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
      tooltip={
        "Your postal code is used to retrieve local weather data and local energy prices."
      }
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
      tooltip={
        <>
          The square footage of your house is used to better estimate heating
          and cooling costs. Larger homes tend to require more energy to heat
          and cool.
        </>
      }
      suffix={
        <>
          ft<sup>2</sup>
        </>
      }
    />
  );
};

export const HomeHeatingTypeSelect: React.FC<{
  label: string;
  tooltip: React.ReactNode;
}> = (props) => {
  const [statusQuoFurnaceFuel, setStatusQuoFurnaceFuel] = useAtom(
    statusQuoFurnaceFuelAtom
  );

  return (
    <FormSelect
      label={props.label}
      tooltip={props.tooltip}
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
      tooltip={
        <Stack>
          <p>
            This is used to determine if switching to a heat pump might allow
            you to save money by canceling your gas service altogether.
          </p>
          <p>
            When you use little or no gas, you still spend money every month on
            a customer service fee. Cancelling your gas service allows you to
            stop paying that.
          </p>
          <p>
            If you have a gas furnace at the moment, but you're planning on
            removing <em>all</em> gas appliances from your house, then choose
            "No" for more accurate estimates.
          </p>
        </Stack>
      }
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

export const AuxSwitchoverTempInput: React.FC = () => {
  const [auxSwitchoverTempC, setAuxSwitchoverTempC] = useAtom(
    auxSwitchoverTempCAtom
  );

  return (
    <NumericFormInputView
      label="Use backup…"
      tooltip={
        <Stack>
          <p>
            This controls when the heat pump will turn off and a backup gas
            furnace will take over.
          </p>
          <p>
            Try playing with this value to balance utility bill costs and
            emissions to your preference.
          </p>
        </Stack>
      }
      minValue={-50}
      maxValue={30}
      step={1}
      value={auxSwitchoverTempC}
      setValue={setAuxSwitchoverTempC}
      prefix="Below"
      textAlign={"right"}
      suffix="°C"
    />
  );
};