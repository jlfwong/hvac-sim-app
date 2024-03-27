import { useAtomValue } from "jotai";
import {
  airConditionerInstallCostAtom,
  electricFurnaceInstallCostAtom,
  floorSpaceSqFtAtom,
  heatpumpInstallCostAtom,
  statusQuoFurnaceFuelAtom,
} from "../app-state/config-state";
import {
  systemComparisonAtom,
  type SystemComparison,
  statusQuoFurnaceInstallCostAtom,
  equipmentLifetimeYears,
} from "../app-state/system-comparison";
import React from "react";
import { Big, Paragraphs } from "./utils";
import { locationInfoAtom } from "../app-state/canadian-weather-state";
import { AnnualBillingView } from "./annual-billing-view";
import { EmissionsView } from "./emissions-view";
import { LifetimeCostOfOwnershipView } from "./lifetime-cost-of-ownership-view";
import { simulationsAtom } from "../app-state/simulations-state";
import {
  electricityPricePerKwhAtom,
  naturalGasPricePerCubicMetreAtom,
} from "../app-state/canadian-utilities-state";
import { BillingView } from "./monthly-billing-view";

function sigDigs(num: number, digits: number = 1) {
  return num.toLocaleString("en-CA", { maximumSignificantDigits: digits });
}

// Round trip flight emissions estimated using Google Flights
const emissionsGramsCO2eRoundTripFlight = 275e3 + 275e3;

const EmissionsComparisonView: React.FC<{
  systemComparison: SystemComparison;
}> = (props) => {
  if (props.systemComparison.annualEmissionsSavingGramsCo2e < 0) {
    return (
      <>
        <Paragraphs>
          <p>
            Oh dear, it looks like a heat pump will actually <em>increase</em>{" "}
            emissions by ~
            {sigDigs(
              -props.systemComparison.annualEmissionsSavingGramsCo2e / 1e6,
              2
            )}{" "}
            tons per year. This tends to happen in areas where electrical power
            generation has exceptionally high emissions.
          </p>
        </Paragraphs>
        <EmissionsView />
      </>
    );
  }
  return (
    <>
      <Paragraphs>
        <Big>
          You could prevent{" "}
          <strong>
            ~
            {sigDigs(
              props.systemComparison.annualEmissionsSavingGramsCo2e / 1e6,
              2
            )}{" "}
            tons of emissions per year by installing a heat pump.
          </strong>
        </Big>
        <p>
          This is roughly equivalent to{" "}
          {sigDigs(
            props.systemComparison.annualEmissionsSavingGramsCo2e /
              emissionsGramsCO2eRoundTripFlight
          )}{" "}
          round-trip flights between Toronto and Vancouver.
        </p>
      </Paragraphs>
      <EmissionsView />
    </>
  );
};

const BillingComparisonView: React.FC<{
  systemComparison: SystemComparison;
}> = (props) => {
  const simulations = useAtomValue(simulationsAtom);

  const electricityPricePerKwh = useAtomValue(electricityPricePerKwhAtom);
  const naturalGasPricePerCubicMetre = useAtomValue(
    naturalGasPricePerCubicMetreAtom
  );

  if (!simulations || !electricityPricePerKwh || !naturalGasPricePerCubicMetre)
    return null;

  if (props.systemComparison.annualOpexCostSavings < 0) {
    return (
      <>
        <Paragraphs>
          <Big>
            A heat pump could cost{" "}
            <strong>
              ~${sigDigs(-props.systemComparison.annualOpexCostSavings, 2)} more
              per year
            </strong>{" "}
            on energy bills.
          </Big>
          <p>
            This tends to happen in areas where natural gas is cheap and
            electricity is expensive.
          </p>
        </Paragraphs>
        <AnnualBillingView />
        <BillingView simulations={simulations} />
      </>
    );
  }

  return (
    <>
      <Paragraphs>
        <Big>
          You could save{" "}
          <strong>
            ~$
            {sigDigs(props.systemComparison.annualOpexCostSavings, 2)} per year
          </strong>{" "}
          on energy bills by installing a heat pump.
        </Big>
      </Paragraphs>
      <AnnualBillingView />
      <BillingView simulations={simulations} />
    </>
  );
};

const PaybackPeriodView: React.FC<{
  systemComparison: SystemComparison;
}> = (props) => {
  let headerMessage: string;
  let explanationMessage: string;

  switch (props.systemComparison.paybackPeriod) {
    case "never": {
      headerMessage =
        "A heat pump is unlikely to pay for itself in its lifespan.";
      explanationMessage = `The heat pump will cost more to install, and there aren't enough cost savings to cover those up-front costs within its ${equipmentLifetimeYears} year lifespan.`;
      break;
    }
    case "immediately": {
      headerMessage = "A heat pump can pay for itself immediately.";
      explanationMessage =
        "Compared to a furnace and an air conditioner, a heat pump costs less to install and operate.";
      break;
    }
    default: {
      let paybackPeriod = props.systemComparison.paybackPeriod;
      headerMessage = `A heat pump can pay for itself in ${paybackPeriod.toFixed(
        0
      )} years`;
      explanationMessage = `This means after ${paybackPeriod.toFixed(
        0
      )} years, you'll pay off the extra up-front costs for the heat pump and benefit from the reduced utility bills.`;
    }
  }

  return (
    <>
      <Paragraphs>
        <Big>{headerMessage}</Big>
        <p>{explanationMessage}</p>
      </Paragraphs>
      <LifetimeCostOfOwnershipView />
    </>
  );

  /*
  return (
    <>
      <Paragraphs>
        <p>
          Let's say that your air conditioner and furnace are near their end of
          life and in need of replacement. You can either get a heat pump or
          replace the furnace and air conditioner.{" "}
        </p>
        <p>
          Assuming a 15 year life span for heating and cooling equipment, a heat
          pump install cost of ${heatpumpInstallCost.toLocaleString()}, an air
          conditioner replacement cost of $
          {airConditionerInstallCost.toLocaleString()}, and a furnace
          replacement cost of ${statusQuoFurnaceInstallCost.toLocaleString()}, a
          heat pump would cost ${Math.abs(heatpumpExcessInstallCost)} more in
          up-front cost.
        </p>
      </Paragraphs>
    </>
  );
  */
};

export const ComparisonSummaryView: React.FC<{}> = (props) => {
  {
    const floorSpaceSqFt = useAtomValue(floorSpaceSqFtAtom);
    const locationInfo = useAtomValue(locationInfoAtom);
    const systemComparison = useAtomValue(systemComparisonAtom);

    if (!floorSpaceSqFt || !systemComparison) return null;

    return (
      <>
        <Paragraphs>
          <p>
            Here are the results for a {floorSpaceSqFt} square foot home in{" "}
            {locationInfo?.placeName.replace(/\s+\(.*\)$/g, "")}:
          </p>
        </Paragraphs>
        <BillingComparisonView systemComparison={systemComparison} />
        <PaybackPeriodView systemComparison={systemComparison} />
        <EmissionsComparisonView systemComparison={systemComparison} />
      </>
    );
  }
};
