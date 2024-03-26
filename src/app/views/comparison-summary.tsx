import { useAtomValue } from "jotai";
import { floorSpaceSqFtAtom } from "../app-state/config-state";
import {
  systemComparisonAtom,
  type SystemComparison,
} from "../app-state/system-comparison";
import React from "react";
import { Big, Paragraphs } from "./utils";
import { locationInfoAtom } from "../app-state/canadian-weather-state";
import { AnnualBillingView } from "./annual-billing-view";
import { EmissionsView } from "./emissions-view";
import { emissionsForSimulationGramsCO2e } from "../../lib/emissions";

function oneSigDig(num: number) {
  return num.toLocaleString("en-CA", { maximumSignificantDigits: 1 });
}

// Round trip flight emissions estimated using Google Flights
const emissionsGramsCO2eRoundTripFlight = 275e3 + 275e3;

const EmissionsComparison: React.FC<{
  systemComparison: SystemComparison;
}> = (props) => {
  if (props.systemComparison.annualEmissionsSavingGramsCo2e < 0) {
    return (
      <>
        <Paragraphs>
          <p>
            Oh dear, it looks like a heat pump will actually <em>increase</em>{" "}
            emissions by ~
            {oneSigDig(
              -props.systemComparison.annualEmissionsSavingGramsCo2e / 1e6
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
            {oneSigDig(
              props.systemComparison.annualEmissionsSavingGramsCo2e / 1e6
            )}{" "}
            tons of emissions per year.
          </strong>
        </Big>
        <p>
          This is roughly equivalent to{" "}
          {oneSigDig(
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

const BillingComparison: React.FC<{
  systemComparison: SystemComparison;
}> = (props) => {
  if (props.systemComparison.annualOpexCostSavings < 0) {
    return (
      <>
        <Paragraphs>
          <p>
            Unfortunately, it looks like a heat pump will cost{" "}
            <strong>
              ~${oneSigDig(-props.systemComparison.annualOpexCostSavings)} more
              per year
            </strong>{" "}
            on energy bills. This tends to happen in areas where natural gas
            prices are cheap and electricity is expensive.
          </p>
        </Paragraphs>
        <AnnualBillingView />
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
            {oneSigDig(props.systemComparison.annualOpexCostSavings)} per year
          </strong>{" "}
          on energy bills.
        </Big>
      </Paragraphs>
      <AnnualBillingView />
    </>
  );
};

export const ComparisonSummary: React.FC<{}> = (props) => {
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
        {/* If there are cost savings, present cost first. Otherwise, present emissions first */}
        {systemComparison.annualOpexCostSavings > 0 ? (
          <>
            <BillingComparison systemComparison={systemComparison} />
            <EmissionsComparison systemComparison={systemComparison} />
          </>
        ) : (
          <>
            <EmissionsComparison systemComparison={systemComparison} />
            <BillingComparison systemComparison={systemComparison} />
          </>
        )}
      </>
    );
  }
};
