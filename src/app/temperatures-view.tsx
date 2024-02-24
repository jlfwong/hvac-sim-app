import React from "react";
import { Group } from "@visx/group";
import { LinePath, Bar } from "@visx/shape";
import { scaleTime, scaleLinear } from "@visx/scale";
import { AxisLeft, AxisBottom } from "@visx/axis";
import { HVACSimulationResult } from "../lib/simulate";
import { fahrenheitToCelcius } from "../lib/units";

export const TemperaturesView: React.FC<{
  simulationResult: HVACSimulationResult;
}> = ({ simulationResult }) => {
  // Set the dimensions and margins of the graph
  const margin = { top: 10, right: 30, bottom: 100, left: 60 },
    width = 860 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  // Data transformation
  const data = simulationResult.timeSteps.map((snapshot) => ({
    date: snapshot.localTime.toJSDate(),
    insideAirTempC: fahrenheitToCelcius(snapshot.insideAirTempF),
    outsideAirTempC: fahrenheitToCelcius(snapshot.weather.outsideAirTempF),
  }));

  // Define the scales
  const xScale = scaleTime({
    domain: [
      Math.min(...data.map((d) => d.date)),
      Math.max(...data.map((d) => d.date)),
    ],
    range: [0, width],
  });

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
  });

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
          strokeWidth={1.5}
        />
        <LinePath
          data={data}
          x={(d) => xScale(d.date)}
          y={(d) => yScale(d.insideAirTempC)}
          stroke="blue"
          strokeWidth={1.5}
        />
      </Group>
    </svg>
  );
};
