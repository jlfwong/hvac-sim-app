import React from "react";
import { Group } from "@visx/group";
import { AreaStack } from "@visx/shape";
import { scaleUtc, scaleLinear } from "@visx/scale";
import { AxisLeft, AxisBottom } from "@visx/axis";
import { HVACSimulationResult } from "../../lib/simulate";
import { scaleOrdinal } from "@visx/scale";
import { schemeSet1 } from "d3-scale-chromatic";
import { ChartGroup, ChartHeader } from "../chart";
import { LegendOrdinal } from "@visx/legend";
import { GridRows } from "@visx/grid";
import { Duration } from "luxon";

export const PassiveLoadsView: React.FC<{
  simulationResult: HVACSimulationResult;
}> = ({ simulationResult }) => {
  // TODO(jlfwong): Bucket these temperatures into high/low per day for a more
  // intuitive display When zooming in, increase the granularity of the buckets.
  // Also draw the heating set point & cooling set point.
  //
  // Instead of changing the buckets, could also still display the line, just
  // fainter.

  // Set the dimensions and margins of the graph
  const margin = { top: 10, right: 30, bottom: 30, left: 60 },
    width = 860 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  // Data transformation
  const tzOffsetMinutes = simulationResult.timeSteps[0].localTime.offset;
  const tzOffsetMs = tzOffsetMinutes * 60 * 1000;

  const data = simulationResult.timeSteps.map((snapshot) => ({
    // Because we're using scaleUTC, dates will be formatted as UTC. What we
    // want, however, is for dates to be displayed in local time. D3 (somewhat
    // reasonably) does not include direct support for this:
    // https://github.com/d3/d3/issues/2375
    //
    // As a gross hack, we'll modify it by the associated timezone so that when
    // it's formatted as UTC, it will display the local time.
    //
    // This is a hack, and doesn't correctly account for DST or other
    // single-location variations in timezone offset, but it's still much more
    // intuitively accurate than displaying UTC or browse local time.
    date: new Date(snapshot.localTime.toMillis() + tzOffsetMs),

    loads: snapshot.passiveLoads.reduce<{ [name: string]: number }>(
      (acc, v) => {
        acc[v.name] = v.btusPerHour;
        return acc;
      },
      {}
    ),
  }));

  // Define the scales
  const xScale = scaleUtc({
    domain: [data[0].date, data[data.length - 1].date],
    range: [0, width],
  }).nice();

  const color = scaleOrdinal()
    .domain(Object.keys(data[0].loads))
    .range(schemeSet1);

  let maxNegative = 0;
  let maxPositive = 0;

  for (let step of simulationResult.timeSteps) {
    const btus = step.passiveLoads.map((v) => v.btusPerHour);

    const negative = btus
      .filter((v) => v < 0)
      .reduce<number>((acc, v) => acc + v, 0);
    if (negative < maxNegative) maxNegative = negative;

    const positive = btus
      .filter((v) => v > 0)
      .reduce<number>((acc, v) => acc + v, 0);
    if (positive > maxPositive) maxPositive = positive;
  }

  const yScale = scaleLinear({
    domain: [maxNegative, maxPositive],
    range: [height, 0],
  }).nice();

  // TODO(jlfwong): There are visual artifacts when loads transition from
  // negative to positive or vice versa. Figure out how to fix this. This
  // will likely require creating several path objects per series.

  // TODO(jlfwong): Tooltips. This will likely require doing the series
  // stacking myself so I can set mouseover events per-area.
  //
  // May also want to consider doing stacked bars instead.
  return (
    <ChartGroup>
      <ChartHeader>Passive Thermal Loads (BTUs/hour)</ChartHeader>
      <svg
        width={width + margin.left + margin.right}
        height={height + margin.top + margin.bottom}
      >
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={yScale} width={width} />
          <AreaStack
            data={data}
            keys={Object.keys(data[0].loads)}
            color={(key) => `${color(key)}` || "red"}
            strokeWidth={0}
            stroke="white"
            value={(d, k) => d.loads[k]}
            x={(d) => xScale(d.data.date)}
            y0={(d) => yScale(d[0])}
            y1={(d) => yScale(d[1])}
            offset={"diverging"}
          />
          <AxisBottom scale={xScale} top={height} />
          <AxisLeft scale={yScale} />
        </Group>
      </svg>
      <div style={{ marginLeft: margin.left }}>
        <LegendOrdinal
          scale={color}
          labelFormat={(key) => {
            switch (key) {
              case "solar-gain": {
                return "Solar gain";
              }
              case "conduction-convection": {
                return "Conduction & convection";
              }
              case "infiltration": {
                return "Infiltration";
              }
              case "occupants": {
                return "Occupants body heat";
              }
            }
            return key;
          }}
        />
      </div>
    </ChartGroup>
  );
};
