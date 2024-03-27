import { useAtom, useAtomValue } from "jotai";
import {
  bestHeatPumpSimulationResultAtom,
  simulationsAtom,
  statusQuoSimulationResultAtom,
} from "../app-state/simulations-state";
import React from "react";
import { ChartGroup, ChartHeader } from "../chart";
import { scaleBand, scaleLinear, scaleOrdinal } from "@visx/scale";
import { schemeSet1 } from "d3-scale-chromatic";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Bar } from "@visx/shape";
import { Group } from "@visx/group";
import type { HVACSimulationResult } from "../../lib/simulate";
import {
  equipmentLifetimeYears,
  heatpumpLifetimeCostAtom,
  statusQuoLifetimeCostAtom,
  systemComparisonAtom,
} from "../app-state/system-comparison";

export const LifetimeCostOfOwnershipView: React.FC<{}> = (props) => {
  const systemComparison = useAtomValue(systemComparisonAtom);
  const heatpumpLifetimeCost = useAtomValue(heatpumpLifetimeCostAtom);
  const statusQuoLifetimeCost = useAtomValue(statusQuoLifetimeCostAtom);

  const bestHeatPumpSimulationResult = useAtomValue(
    bestHeatPumpSimulationResultAtom
  );
  const statusQuoSimulationResult = useAtomValue(statusQuoSimulationResultAtom);

  if (
    !systemComparison ||
    bestHeatPumpSimulationResult == null ||
    statusQuoSimulationResult == null ||
    heatpumpLifetimeCost == null ||
    statusQuoLifetimeCost == null
  )
    return null;

  const margin = { top: 10, right: 30, bottom: 40, left: 150 },
    width = 860 - margin.left - margin.right,
    height = 120 - margin.top - margin.bottom;

  const x = scaleLinear<number>({
    domain: [0, Math.max(heatpumpLifetimeCost, statusQuoLifetimeCost)],
    range: [0, width],
  }).nice();

  const names = [
    bestHeatPumpSimulationResult.name,
    statusQuoSimulationResult.name,
  ];

  const y = scaleBand<string>({
    domain: names,
    paddingInner: 0.1,
    paddingOuter: 0.1,
    range: [0, height],
  });

  const color = scaleOrdinal<string, string>().domain(names).range(schemeSet1);

  /* TODO(jlfwong): Replace this with a burndown chart */

  return (
    <ChartGroup>
      <ChartHeader>
        Lifetime Cost of Ownership ({equipmentLifetimeYears} Years)
      </ChartHeader>
      <svg
        width={width + margin.left + margin.right}
        height={height + margin.top + margin.bottom}
      >
        <Group left={margin.left} top={margin.top}>
          {names.map((name) => {
            return (
              <Bar
                key={name}
                x={0}
                y={y(name)}
                height={y.bandwidth()}
                fill={color(name)}
                width={x(
                  name === bestHeatPumpSimulationResult.name
                    ? heatpumpLifetimeCost
                    : statusQuoLifetimeCost
                )}
              />
            );
          })}
          <AxisBottom
            top={height}
            scale={x}
            tickFormat={(t) => `\$${t.toLocaleString()}`}
          />
          <AxisLeft scale={y} />
        </Group>
      </svg>
    </ChartGroup>
  );
};
