import React from "react";
import { Group } from "@visx/group";
import { LinePath } from "@visx/shape";
import { scaleUtc, scaleLinear } from "@visx/scale";
import { AxisLeft, AxisBottom } from "@visx/axis";
import { HVACSimulationResult } from "../lib/simulate";
import { fahrenheitToCelcius } from "../lib/units";

export const TemperaturesView: React.FC<{
  simulationResult: HVACSimulationResult;
}> = ({ simulationResult }) => {
  // TODO(jlfwong): Bucket these temperatures into high/low per day for a more
  // intuitive display When zooming in, increase the granularity of the buckets.
  // Also draw the heating set point & cooling set point.
  //
  // Instead of changing the buckets, could also still display the line, just
  // fainter.

  // Set the dimensions and margins of the graph
  const margin = { top: 10, right: 30, bottom: 100, left: 60 },
    width = 860 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  // Data transformation
  const tzOffsetMinutes = simulationResult.timeSteps[0].localTime.offset;

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
    date: snapshot.localTime
      .toUTC()
      .plus({ minutes: tzOffsetMinutes })
      .toJSDate(),

    insideAirTempC: fahrenheitToCelcius(snapshot.insideAirTempF),
    outsideAirTempC: fahrenheitToCelcius(snapshot.weather.outsideAirTempF),
  }));

  // Define the scales
  const xScale = scaleUtc({
    domain: [
      Math.min(...data.map((d) => d.date)),
      Math.max(...data.map((d) => d.date)),
    ],
    range: [0, width],
  }).nice();

  const yScale = scaleLinear({
    domain: [
      Math.min(
        ...data.map((d) => Math.min(d.insideAirTempC, d.outsideAirTempC))
      ) - 5,
      Math.max(
        ...data.map((d) => Math.max(d.insideAirTempC, d.outsideAirTempC))
      ) + 5,
    ],
    range: [height, 0],
  }).nice();

  return (
    <svg
      width={width + margin.left + margin.right}
      height={height + margin.top + margin.bottom}
    >
      <Group left={margin.left} top={margin.top}>
        {/* TODO(jlfwong): Fix the axis labels to be tilted 45 deg */}
        <AxisBottom scale={xScale} top={height} />
        <AxisLeft scale={yScale} />
        <LinePath
          data={data}
          x={(d) => xScale(d.date)}
          y={(d) => yScale(d.outsideAirTempC)}
          stroke="red"
          strokeWidth={1}
        />
        <LinePath
          data={data}
          x={(d) => xScale(d.date)}
          y={(d) => yScale(d.insideAirTempC)}
          stroke="blue"
          strokeWidth={1}
        />
      </Group>
    </svg>
  );
};
