import { useAtomValue } from "jotai";
import {
  simulationsAtom,
  type HVACSimulationResultWithEmissions,
} from "../app-state/simulations-state";
import React from "react";
import { ChartGroup, ChartHeader } from "../chart";
import { scaleBand, scaleLinear, scaleOrdinal } from "@visx/scale";
import { schemeSet1 } from "d3-scale-chromatic";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Bar } from "@visx/shape";
import { Group } from "@visx/group";

export const EmissionsView: React.FC<{}> = (props) => {
  const simulations = useAtomValue(simulationsAtom);

  if (!simulations) return null;

  const margin = { top: 10, right: 30, bottom: 40, left: 150 },
    width = 860 - margin.left - margin.right,
    height = 120 - margin.top - margin.bottom;

  const tCO2e = (s: HVACSimulationResultWithEmissions) =>
    s.emissionsGramsCO2e / 1e6;

  const x = scaleLinear<number>({
    domain: [0, Math.max(...simulations.map((s) => tCO2e(s)))],
    range: [0, width],
  }).nice();

  const y = scaleBand<string>({
    domain: simulations.map((s) => s.name),
    paddingInner: 0.1,
    paddingOuter: 0.1,
    range: [0, height],
  });

  const color = scaleOrdinal<string, string>()
    .domain(simulations.map((s) => s.name))
    .range(schemeSet1);

  return (
    <ChartGroup>
      <ChartHeader>Annual Emissions</ChartHeader>
      <svg
        width={width + margin.left + margin.right}
        height={height + margin.top + margin.bottom}
      >
        <Group left={margin.left} top={margin.top}>
          {simulations.map((s) => {
            return (
              <Bar
                key={s.name}
                x={0}
                y={y(s.name)}
                height={y.bandwidth()}
                fill={color(s.name)}
                width={x(tCO2e(s))}
              />
            );
          })}
          <AxisBottom
            top={height}
            scale={x}
            tickFormat={(t) => `${t} tonnes`}
          />
          <AxisLeft scale={y} />
        </Group>
      </svg>
    </ChartGroup>
  );
};
