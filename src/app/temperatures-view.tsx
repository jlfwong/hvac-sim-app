import React from "react";
import { Group } from "@visx/group";
import { LinePath, Bar } from "@visx/shape";
import { Text } from "@visx/text";
import { scaleUtc, scaleLinear } from "@visx/scale";
import { AxisLeft, AxisBottom } from "@visx/axis";
import { HVACSimulationResult } from "../lib/simulate";
import { fahrenheitToCelcius } from "../lib/units";

export const TemperaturesView: React.FC<{
  heatingSetPointC: number;
  coolingSetPointC: number;
  simulationResult: HVACSimulationResult;
}> = (props) => {
  // TODO(jlfwong): Bucket these temperatures into high/low per day for a more
  // intuitive display When zooming in, increase the granularity of the buckets.
  // Also draw the heating set point & cooling set point.
  //
  // Instead of changing the buckets, could also still display the line, just
  // fainter.

  // Set the dimensions and margins of the graph
  const margin = { top: 30, right: 30, bottom: 30, left: 60 },
    width = 860 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  // Data transformation
  const tzOffsetMinutes = props.simulationResult.timeSteps[0].localTime.offset;

  let minTempC = 1000;
  let maxTempC = -1000;

  const data = props.simulationResult.timeSteps.map((snapshot) => {
    const insideAirTempC = fahrenheitToCelcius(snapshot.insideAirTempF);
    const outsideAirTempC = fahrenheitToCelcius(
      snapshot.weather.outsideAirTempF
    );

    minTempC = Math.min(minTempC, insideAirTempC, outsideAirTempC);
    maxTempC = Math.max(maxTempC, insideAirTempC, outsideAirTempC);

    return {
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
    };
  });

  // Define the scales
  const xScale = scaleUtc({
    domain: [data[0].date, data[data.length - 1].date],
    range: [0, width],
  }).nice();

  const yScale = scaleLinear({
    domain: [minTempC - 5, maxTempC + 5],
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
        <AxisLeft
          scale={yScale}
          tickFormat={(temp) => `${(+temp).toFixed(0)}°C`}
        />
        <Bar
          x={xScale.range()[0]}
          y={yScale(props.coolingSetPointC)}
          width={xScale.range()[1] - xScale.range()[0]}
          height={
            yScale(props.heatingSetPointC) - yScale(props.coolingSetPointC)
          }
          fill="rgba(0, 0, 255, 0.2)"
        />
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
