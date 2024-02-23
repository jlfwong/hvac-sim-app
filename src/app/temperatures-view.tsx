import * as d3 from "d3";
import React, { useEffect, useRef } from "react";
import { HVACSimulationResult } from "../lib/simulate";
import { fahrenheitToCelcius } from "../lib/units";

export const TemperaturesView: React.FC<{
  simulationResult: HVACSimulationResult;
}> = (props) => {
  // Set the dimensions and margins of the graph
  const margin = { top: 10, right: 30, bottom: 100, left: 60 },
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  // TODO(jlfwong): memo
  const data = props.simulationResult.timeSteps.map((snapshot) => ({
    date: snapshot.localTime.toJSDate(),
    insideAirTempC: fahrenheitToCelcius(snapshot.insideAirTempF),
    outsideAirTempC: fahrenheitToCelcius(snapshot.weather.outsideAirTempF),
  }));

  // Define the x & y axis scales
  const x = d3
    .scaleTime()
    .domain(d3.extent(data, (d) => d.date) as [Date, Date])
    .range([0, width]);

  const y = d3
    .scaleLinear()
    .domain([
      (d3.min(data, (d) =>
        Math.min(d.insideAirTempC, d.outsideAirTempC)
      ) as number) - 5,
      (d3.max(data, (d) =>
        Math.max(d.insideAirTempC, d.outsideAirTempC)
      ) as number) + 5,
    ])
    .range([height, 0]);

  const xAxisRef = useRef<SVGGElement | null>(null);
  const yAxisRef = useRef<SVGGElement | null>(null);

  useEffect(() => {
    if (!xAxisRef.current || !yAxisRef.current) {
      return;
    }

    d3.select(xAxisRef.current)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "start")
      .attr("dx", "0.8em")
      .attr("dy", "0.15em")
      .attr("transform", "rotate(45)");

    d3.select(yAxisRef.current).call(
      d3.axisLeft(y).tickFormat((d) => `${d}°C`)
    );
  }, [data]);

  const outsidePath = d3
    .line<{
      date: Date;
      insideAirTempC: number;
      outsideAirTempC: number;
    }>()
    .x((d) => x(d.date))
    .y((d) => y(d.outsideAirTempC));

  const insidePath = d3
    .line<{
      date: Date;
      insideAirTempC: number;
      outsideAirTempC: number;
    }>()
    .x((d) => x(d.date))
    .y((d) => y(d.insideAirTempC));

  return (
    <svg
      width={width + margin.left + margin.right}
      height={height + margin.top + margin.bottom}
    >
      <g transform={`translate(${margin.left},${margin.top})`}>
        <g ref={xAxisRef} transform={`translate(0, ${height})`} />
        <g ref={yAxisRef} />
        <path
          stroke="red"
          fill="none"
          strokeWidth={1.5}
          d={outsidePath(data)!}
        />
        <path
          stroke="blue"
          fill="none"
          strokeWidth={1.5}
          d={insidePath(data)!}
        />
      </g>
    </svg>
  );
};
