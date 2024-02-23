import * as d3 from "d3";
import { HVACSimulationResult } from "../lib/simulate";
import React, { useEffect, useRef } from "react";

export const BillingView: React.FC<{
  simulationResult: HVACSimulationResult;
}> = (props) => {
  let data = props.simulationResult.bills.electricity!.map((b, i) => {
    const electricity = props.simulationResult.bills.electricity![i];
    const gas = props.simulationResult.bills.naturalGas![i];
    return {
      date: electricity.getBillingPeriodStart(),
      gas: gas.getTotalCost(),
      electricity: electricity.getTotalCost(),
    };
  });

  // Color scale for the bars
  const color = d3.scaleOrdinal(["electricity", "gas"], d3.schemeCategory10);

  const margin = { top: 20, right: 20, bottom: 70, left: 60 },
    width = 500 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

  // Set up the x-axis scale
  const x = d3
    .scaleBand()
    .paddingInner(0.1)
    .domain(data.map((d) => d.date.toFormat("LLL")))
    .rangeRound([0, width]);

  // Set up the y-axis scale
  //
  // TODO(jlfwong): Ensure the y-axes on each graph in the comparison
  // view are the same
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => d.gas + d.electricity) as number])
    .range([height, 0]);

  const xAxisRef = useRef<SVGGElement | null>(null);
  const yAxisRef = useRef<SVGGElement | null>(null);

  const currencyFormat = d3.format("$.0f");

  useEffect(() => {
    if (!xAxisRef.current || !yAxisRef.current) {
      return;
    }

    d3.select(xAxisRef.current).call(d3.axisBottom(x));

    d3.select(yAxisRef.current).call(
      d3.axisLeft(y).tickFormat((d) => currencyFormat(d))
    );
  }, [data]);

  const totalGas = props.simulationResult.bills.naturalGas!.reduce(
    (a, b) => a + b.getTotalCost(),
    0
  );
  const totalElectricity = props.simulationResult.bills.electricity!.reduce(
    (a, b) => a + b.getTotalCost(),
    0
  );

  return (
    <div>
      <svg
        width={width + margin.left + margin.right}
        height={height + margin.top + margin.bottom}
      >
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          <g ref={xAxisRef} transform={`translate(0, ${height})`}></g>
          <g ref={yAxisRef}></g>
          {data.map((monthData) => {
            return (
              <g transform={`translate(${x(monthData.date.toFormat("LLL"))})`}>
                <rect
                  x={0}
                  y={y(monthData.electricity)}
                  width={x.bandwidth()}
                  height={y(0) - y(monthData.electricity)}
                  fill={color("electricity")}
                />
                <rect
                  x={0}
                  y={y(monthData.gas + monthData.electricity)}
                  width={x.bandwidth()}
                  height={y(0) - y(monthData.gas)}
                  fill={color("gas")}
                />
              </g>
            );
          })}
        </g>
      </svg>
      <div>{`Total electricity: ${currencyFormat(totalElectricity)}`}</div>
      <div>{`Total gas: ${currencyFormat(totalGas)}`}</div>
      <div>{`Grand total: ${currencyFormat(totalGas + totalElectricity)}`}</div>
    </div>
  );
};
