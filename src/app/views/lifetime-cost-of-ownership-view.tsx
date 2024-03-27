import { useAtom, useAtomValue } from "jotai";
import {
  bestHeatPumpSimulationResultAtom,
  statusQuoSimulationResultAtom,
} from "../app-state/simulations-state";
import React from "react";
import { ChartGroup, ChartHeader } from "../chart";
import { scaleBand, scaleLinear, scaleOrdinal, scaleUtc } from "@visx/scale";
import { schemeSet1 } from "d3-scale-chromatic";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Bar, Line, LinePath } from "@visx/shape";
import { curveStepAfter, curveStepBefore } from "@visx/curve";
import { Group } from "@visx/group";
import {
  equipmentLifetimeYears,
  heatpumpLifetimeCostAtom,
  statusQuoFurnaceInstallCostAtom,
  statusQuoLifetimeCostAtom,
  systemComparisonAtom,
} from "../app-state/system-comparison";
import {
  heatpumpInstallCostAtom,
  airConditionerInstallCostAtom,
} from "../app-state/config-state";
import { DateTime } from "luxon";
import { LegendOrdinal } from "@visx/legend";
import { GridRows } from "@visx/grid";

export const LifetimeCostOfOwnershipView: React.FC<{}> = (props) => {
  const systemComparison = useAtomValue(systemComparisonAtom);

  const heatpumpInstallCost = useAtomValue(heatpumpInstallCostAtom);
  const statusQuoFurnaceInstallCost = useAtomValue(
    statusQuoFurnaceInstallCostAtom
  );
  const airConditionerInstallCost = useAtomValue(airConditionerInstallCostAtom);

  const bestHeatPumpSimulationResult = useAtomValue(
    bestHeatPumpSimulationResultAtom
  );
  const statusQuoSimulationResult = useAtomValue(statusQuoSimulationResultAtom);

  if (
    systemComparison == null ||
    heatpumpInstallCost == null ||
    bestHeatPumpSimulationResult == null ||
    statusQuoFurnaceInstallCost == null ||
    airConditionerInstallCost == null ||
    statusQuoSimulationResult == null ||
    bestHeatPumpSimulationResult == null
  ) {
    return null;
  }

  function year(n: number): Date {
    return DateTime.utc(DateTime.utc().year + n).toJSDate();
  }

  const heatPumpSeries: [Date, number][] = [[year(0), heatpumpInstallCost]];
  const statusQuoSeries: [Date, number][] = [
    [year(0), statusQuoFurnaceInstallCost + airConditionerInstallCost],
  ];

  // TODO(jlfwong): Update this to use the monthly billing numbers
  let hp = heatPumpSeries[0][1];
  let sq = statusQuoSeries[0][1];
  const startYear = DateTime.utc().year;

  const sortedHPBills = [...bestHeatPumpSimulationResult.bills].sort(
    (a, b) =>
      a.getBillingPeriodEnd().toMillis() - b.getBillingPeriodEnd().toMillis()
  );
  const sortedSQBills = [...statusQuoSimulationResult.bills].sort(
    (a, b) =>
      a.getBillingPeriodEnd().toMillis() - b.getBillingPeriodEnd().toMillis()
  );

  for (let i = 0; i <= equipmentLifetimeYears; i++) {
    const year = startYear + i;
    for (let bill of sortedHPBills) {
      hp += bill.getTotalCost();
      heatPumpSeries.push([
        bill.getBillingPeriodEnd().set({ year }).toUTC().toJSDate(),
        hp,
      ]);
    }

    for (let bill of sortedSQBills) {
      sq += bill.getTotalCost();
      statusQuoSeries.push([
        bill.getBillingPeriodEnd().set({ year }).toUTC().toJSDate(),
        sq,
      ]);
    }
  }

  const margin = { top: 10, right: 30, bottom: 40, left: 60 },
    width = 860 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  const x = scaleUtc<number>({
    domain: [
      heatPumpSeries[0][0],
      heatPumpSeries[heatPumpSeries.length - 1][0],
    ],
    range: [0, width],
  });

  const names = [
    bestHeatPumpSimulationResult.name,
    statusQuoSimulationResult.name,
  ];

  const y = scaleLinear({
    domain: [
      0,
      Math.max(
        heatPumpSeries[heatPumpSeries.length - 1][1],
        statusQuoSeries[statusQuoSeries.length - 1][1]
      ),
    ],
    range: [height, 0],
  }).nice();

  const color = scaleOrdinal<string, string>().domain(names).range(schemeSet1);

  return (
    <ChartGroup>
      <ChartHeader>
        Total Cost Over Time (Install Costs + Utility Bills)
      </ChartHeader>
      <svg
        width={width + margin.left + margin.right}
        height={height + margin.top + margin.bottom}
      >
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={y} width={width} />
          <LinePath
            data={heatPumpSeries}
            x={(d) => x(d[0])}
            y={(d) => y(d[1])}
            stroke={color(bestHeatPumpSimulationResult.name)}
            strokeWidth={2}
            curve={curveStepAfter}
          />
          <LinePath
            data={statusQuoSeries}
            x={(d) => x(d[0])}
            y={(d) => y(d[1])}
            stroke={color(statusQuoSimulationResult.name)}
            strokeWidth={2}
            curve={curveStepAfter}
          />
          <AxisBottom top={height} scale={x} />
          <AxisLeft scale={y} tickFormat={(t) => `\$${t.toLocaleString()}`} />
        </Group>
      </svg>
      <div style={{ marginLeft: margin.left }}>
        <LegendOrdinal scale={color} />
      </div>
    </ChartGroup>
  );
};
