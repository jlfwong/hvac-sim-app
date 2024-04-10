import React from "react";
import { Group } from "@visx/group";
import { LinePath, Bar } from "@visx/shape";
import { scaleUtc, scaleLinear, scaleOrdinal } from "@visx/scale";
import { AxisLeft, AxisBottom } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { HVACSimulationResult } from "../../lib/simulate";
import { fahrenheitToCelcius } from "../../lib/units";
import { ChartGroup, ChartHeader } from "../chart";
import { LegendOrdinal } from "@visx/legend";
import { DateTime } from "luxon";

function formatDate(date: Date | number | { valueOf(): number }): string {
  const dt = DateTime.fromMillis(+date);
  const shortMonth = dt.toFormat("LLL");
  if (shortMonth === "Dec") {
    return dt.toFormat("yyyy");
  } else {
    return shortMonth;
  }
}

export const TemperaturesView: React.FC<{
  heatingSetPointC: number;
  coolingSetPointC: number;
  simulationResult: HVACSimulationResult;
}> = (props) => {
  // TODO(jlfwong): Zooming support.
  //
  // Instead of changing the buckets, could also still display the line, just
  // fainter.

  // Set the dimensions and margins of the graph
  const margin = { top: 10, right: 30, bottom: 30, left: 60 },
    width = 430 - margin.left - margin.right,
    height = 200 - margin.top - margin.bottom;

  // Data transformation
  const tzOffsetMinutes = props.simulationResult.timeSteps[0].localTime.offset;
  const tzOffsetMs = tzOffsetMinutes * 60 * 1000;

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
      // intuitively accurate than displaying UTC or browser local time.
      date: new Date(snapshot.localTime.toMillis() + tzOffsetMs),

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
    domain: [minTempC - 2, maxTempC + 2],
    range: [height, 0],
  }).nice();

  const color = scaleOrdinal<"inside" | "comfort-range" | "outside", string>()
    .domain(["outside", "inside", "comfort-range"])
    .range(["#1D82F8", "#F8861D", "rgba(248, 134, 29, 0.2)"]);

  return (
    <ChartGroup>
      <ChartHeader>Outside & Simulated Inside Temperatures</ChartHeader>
      <svg
        viewBox={`0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`}
        style={{ width: "100%", height: "auto" }}
      >
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={yScale} width={width} />
          <Bar
            x={xScale.range()[0]}
            y={yScale(props.coolingSetPointC)}
            width={xScale.range()[1] - xScale.range()[0]}
            height={
              yScale(props.heatingSetPointC) - yScale(props.coolingSetPointC)
            }
            fill={color("comfort-range")}
          />
          <LinePath
            data={data}
            x={(d) => xScale(d.date)}
            y={(d) => yScale(d.outsideAirTempC)}
            stroke={color("outside")}
            strokeWidth={1}
          />
          <LinePath
            data={data}
            x={(d) => xScale(d.date)}
            y={(d) => yScale(d.insideAirTempC)}
            stroke={color("inside")}
            strokeWidth={1}
          />
          <AxisBottom scale={xScale} top={height} tickFormat={formatDate} />
          <AxisLeft
            scale={yScale}
            numTicks={5}
            tickFormat={(temp) => `${(+temp).toFixed(0)}°C`}
          />
        </Group>
      </svg>
      <div style={{ marginLeft: margin.left }}>
        <LegendOrdinal
          scale={color}
          labelFormat={(name) => {
            switch (name) {
              case "comfort-range": {
                return "Target inside air temperature range";
              }
              case "inside": {
                return `Simulated inside air temperature`;
              }
              case "outside": {
                return "Outside air temperature";
              }
            }
          }}
        />
      </div>
    </ChartGroup>
  );
};
