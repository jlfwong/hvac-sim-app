import React from "react";
import { Group } from "@visx/group";
import { Bar } from "@visx/shape";
import { PatternLines } from "@visx/pattern";
import {
  useTooltip,
  useTooltipInPortal,
  TooltipWithBounds,
} from "@visx/tooltip";
import { localPoint } from "@visx/event";

import { scaleBand, scaleLinear, scaleOrdinal } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { HVACSimulationResult } from "../lib/simulate";
import { DateTime } from "luxon";
import { EnergyBill } from "../lib/billing";

export const BillingView: React.FC<{
  simulationResults: HVACSimulationResult[];
}> = ({ simulationResults }) => {
  // TODO(jlfwong): Legends, axis titles, pretty printed month names

  const margin = { top: 20, right: 20, bottom: 70, left: 60 },
    width = 860 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  const monthKey = (date: DateTime) => date.toFormat("yyyy-LL");

  let dateRange = simulationResults
    .flatMap((res) => res.bills.flatMap((b) => b.getBillingPeriodStart()))
    .reduce(
      (acc, date) => {
        if (!acc[0] || date < acc[0]) acc[0] = date;
        if (!acc[1] || date > acc[1]) acc[1] = date;
        return acc;
      },
      [undefined, undefined] as (DateTime | undefined)[]
    );

  let xAxisDomain: string[] = [];
  if (dateRange[0] && dateRange[1]) {
    for (
      let date = dateRange[0];
      date <= dateRange[1];
      date = date.plus({ months: 1 })
    ) {
      xAxisDomain.push(monthKey(date));
    }
  }

  const allBills: { [key: string]: EnergyBill[] }[] = simulationResults.map(
    (res) => {
      let map: { [key: string]: EnergyBill[] } = {};
      res.bills.forEach((bill) => {
        const key = monthKey(bill.getBillingPeriodStart());
        if (!map[key]) {
          map[key] = [bill];
        } else {
          map[key].push(bill);
        }
      });
      return map;
    }
  );

  const xMajor = scaleBand<string>({
    domain: xAxisDomain,
    paddingInner: 0.2,
    range: [0, width],
  });

  const xMinor = scaleBand<string>({
    domain: simulationResults.map((_, i) => i.toString()),
    paddingInner: 0.1,
    range: [0, xMajor.bandwidth()],
  });

  const y = scaleLinear<number>({
    domain: [
      0,
      Math.max(
        ...allBills.flatMap((billsByMonth) =>
          Object.values(billsByMonth).flatMap((bills) =>
            bills.reduce((acc, bill) => acc + bill.getTotalCost(), 0)
          )
        )
      ),
    ],
    range: [height, 0],
  });

  const color = scaleOrdinal({
    domain: ["electricity", "natural gas"],
    range: ["green", "orange"],
  });

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<EnergyBill>();

  // If you don't want to use a Portal, simply replace `TooltipInPortal` below with
  // `Tooltip` or `TooltipWithBounds` and remove `containerRef`
  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    // use TooltipWithBounds
    detectBounds: true,
    // when tooltip containers are scrolled, this will correctly update the Tooltip position
    scroll: true,
  });

  const handleMouseOver = (event: React.MouseEvent, bill: EnergyBill) => {
    const coords = localPoint(
      (event.target as SVGElement).ownerSVGElement!,
      event
    )!;
    showTooltip({
      tooltipLeft: coords.x,
      tooltipTop: coords.y,
      tooltipData: bill,
    });
  };

  return (
    <>
      <svg
        width={width + margin.left + margin.right}
        height={height + margin.top + margin.bottom}
        ref={containerRef}
      >
        <PatternLines
          id="green-lines"
          height={10}
          width={10}
          background="green"
          stroke={"white"}
          strokeWidth={1}
          orientation={["diagonal"]}
        />
        <PatternLines
          id="orange-lines"
          height={10}
          width={10}
          background="orange"
          stroke={"white"}
          strokeWidth={1}
          orientation={["diagonal"]}
        />
        <Group left={margin.left} top={margin.top}>
          <AxisBottom top={height} scale={xMajor} />
          <AxisLeft scale={y} tickFormat={(v) => `\$${v}`} />
          {allBills.flatMap((billsByMonth, idx) =>
            Object.entries(billsByMonth).flatMap(([month, bills]) => {
              let runningTotalCost = 0;

              return bills.map((bill, billIdx) => {
                const rectX = xMajor(month)! + xMinor(idx.toString())!;
                runningTotalCost += bill.getTotalCost();
                const rectY = y(runningTotalCost);
                const fillColor = color(bill.getFuelType());

                return (
                  <Bar
                    key={`bar-${month}-${idx}-${billIdx}`}
                    x={rectX}
                    y={rectY}
                    width={xMinor.bandwidth()}
                    height={y(0) - y(bill.getTotalCost())}
                    onMouseOver={(ev) => handleMouseOver(ev, bill)}
                    onMouseOut={hideTooltip}
                    fill={idx % 2 == 0 ? fillColor : `url(#${fillColor}-lines)`}
                  />
                );
              });
            })
          )}
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          // set this to random so it correctly updates with parent bounds
          key={Math.random()}
          top={tooltipTop}
          left={tooltipLeft}
        >
          {/* TODO(jlfwong): Make one tooltip per simulation/month instead of one per bill */}
          {`${tooltipData.getFuelType()} bill`}
          <br />
          {`Usage: ${tooltipData
            .getFuelUsage()
            .toFixed(2)} ${tooltipData.getFuelUnit()}`}
          <br />
          {`Total: \$${tooltipData.getTotalCost().toFixed(2)}`}
        </TooltipInPortal>
      )}
    </>
  );
};
