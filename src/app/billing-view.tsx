import * as d3 from "d3";
import { HVACSimulationResult } from "../lib/simulate";
import React, { useEffect, useRef } from "react";
import { DateTime } from "luxon";
import { EnergyBill } from "../lib/billing";

export const BillingView: React.FC<{
  simulationResults: HVACSimulationResult[];
}> = (props) => {
  // Color scale for the bars
  //
  // TODO(jlfwong): Add fuel
  const color = d3.scaleOrdinal(["electricity", "gas"], d3.schemeCategory10);

  const monthKey = (date: DateTime) => date.toFormat("yyyy-LL");

  const margin = { top: 20, right: 20, bottom: 70, left: 60 },
    width = 860 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  let dateRange = d3.extent(
    props.simulationResults.flatMap((res) =>
      res.bills.flatMap((b) => b.getBillingPeriodStart())
    )
  );

  let xAxisDomain: string[] = [];
  if (dateRange[0] && dateRange[1]) {
    console.log("from", dateRange[0], "to", dateRange[1]);
    for (
      let date = dateRange[0];
      date <= dateRange[1];
      date = date.plus({ month: 1 })
    ) {
      xAxisDomain.push(monthKey(date));
    }
  }

  const allBills: { [key: string]: EnergyBill[] }[] =
    props.simulationResults.map((res) => {
      let map: { [key: string]: EnergyBill[] } = {};
      for (let bill of res.bills) {
        const key = monthKey(bill.getBillingPeriodStart());
        if (!(key in map)) {
          map[key] = [bill];
        } else {
          map[key].push(bill);
        }
      }
      return map;
    });

  // Set up the x-axis scale
  const xMajor = d3
    .scaleBand()
    .paddingInner(0.2)
    .domain(xAxisDomain)
    .rangeRound([0, width]);

  const xMinor = d3
    .scaleBand()
    .domain(d3.range(props.simulationResults.length).map((v) => v.toString()))
    .paddingInner(0.1)
    .rangeRound([0, xMajor.bandwidth()]);

  // Set up the y-axis scale
  const y = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(
        allBills.flatMap((billsByMonth) => {
          return Object.values(billsByMonth).map((bills) =>
            d3.sum(bills.map((b) => b.getTotalCost()))
          );
        })
      )!,
    ])
    .range([height, 0]);

  const xAxisRef = useRef<SVGGElement | null>(null);
  const yAxisRef = useRef<SVGGElement | null>(null);

  const currencyFormat = d3.format("$.0f");

  useEffect(() => {
    if (!xAxisRef.current || !yAxisRef.current) {
      return;
    }

    d3.select(xAxisRef.current).call(d3.axisBottom(xMajor));

    d3.select(yAxisRef.current).call(
      d3.axisLeft(y).tickFormat((d) => currencyFormat(d))
    );
  }, [props.simulationResults]);

  return (
    <div>
      <svg
        width={width + margin.left + margin.right}
        height={height + margin.top + margin.bottom}
      >
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          <g ref={xAxisRef} transform={`translate(0, ${height})`}></g>
          <g ref={yAxisRef}></g>
          {allBills.flatMap((billsByMonth, billSetIdx) => {
            return Object.values(billsByMonth).flatMap((bills) => {
              let runningTotalCost = 0;

              return d3.reverse(bills).map((bill, billIdx) => {
                const billMonthKey = monthKey(bill.getBillingPeriodStart());
                const rectX = xMajor(billMonthKey)! + xMinor(`${billSetIdx}`)!;
                const rectY = y(runningTotalCost + bill.getTotalCost());
                runningTotalCost += bill.getTotalCost();

                return (
                  <rect
                    key={`${billSetIdx}-${billIdx}`}
                    x={rectX}
                    y={rectY}
                    width={xMinor.bandwidth()}
                    height={y(0) - y(bill.getTotalCost())}
                    fill={color(bill.getFuelType())}
                  />
                );
              });
            });
          })}
        </g>
      </svg>
    </div>
  );
};
