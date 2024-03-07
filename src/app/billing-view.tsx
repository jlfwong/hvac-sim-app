import React from "react";
import { Group } from "@visx/group";
import { Bar } from "@visx/shape";
import { PatternLines } from "@visx/pattern";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { schemeSet1 } from "d3-scale-chromatic";
import { localPoint } from "@visx/event";
import { LegendOrdinal } from "@visx/legend";

import { scaleBand, scaleLinear, scaleOrdinal } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { HVACSimulationResult } from "../lib/simulate";
import { DateTime } from "luxon";
import { EnergyBill } from "../lib/billing";
import { ChartGroup, ChartHeader } from "./chart";

export const BillingView: React.FC<{
  simulations: HVACSimulationResult[];
}> = (props) => {
  const margin = { top: 10, right: 20, bottom: 40, left: 60 },
    width = 860 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  const monthKey = (date: DateTime) => date.toFormat("yyyy-LL");

  let dateRange = props.simulations
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

  const allBills: { [key: string]: EnergyBill[] }[] = props.simulations.map(
    (sim) => {
      let map: { [key: string]: EnergyBill[] } = {};
      sim.bills.forEach((bill) => {
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
    domain: props.simulations.map((_, i) => i.toString()),
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
  }).nice();

  const color = scaleOrdinal<string>()
    .domain(props.simulations.map((s) => s.name))
    .range(schemeSet1);

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<{ name: string; bills: EnergyBill[] }>();

  // If you don't want to use a Portal, simply replace `TooltipInPortal` below with
  // `Tooltip` or `TooltipWithBounds` and remove `containerRef`
  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    // use TooltipWithBounds
    detectBounds: true,
    // when tooltip containers are scrolled, this will correctly update the Tooltip position
    scroll: true,
  });

  const handleMouseOver = (
    event: React.MouseEvent,
    simIdx: number,
    monthKey: string
  ) => {
    const coords = localPoint(
      (event.target as SVGElement).ownerSVGElement!,
      event
    )!;
    showTooltip({
      tooltipLeft: coords.x,
      tooltipTop: coords.y,
      tooltipData: {
        name: props.simulations[simIdx].name,
        bills: allBills[simIdx][monthKey],
      },
    });
  };

  const monthTickFormat = (value: string): string => {
    return DateTime.fromObject({
      year: parseInt(value.split("-")[0]),
      month: parseInt(value.split("-")[1]),
    }).toFormat("LLLL");
  };

  return (
    <ChartGroup>
      <ChartHeader>Energy Bills</ChartHeader>
      <svg
        width={width + margin.left + margin.right}
        height={height + margin.top + margin.bottom}
        ref={containerRef}
      >
        {color.range().map((value) => {
          return (
            <PatternLines
              key={`${value}`}
              id={`lines-${value}`}
              height={5}
              width={5}
              stroke={`${value}`}
              background={"white"}
              strokeWidth={2}
              orientation={["diagonal"]}
            />
          );
        })}
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={y} width={width} />
          {allBills.flatMap((billsByMonth, idx) =>
            Object.entries(billsByMonth).flatMap(([month, bills]) => {
              let runningTotalCost = 0;

              return (
                <Group
                  onMouseOver={(ev) => handleMouseOver(ev, idx, month)}
                  onMouseOut={hideTooltip}
                >
                  {bills.map((bill, billIdx) => {
                    const rectX = xMajor(month)! + xMinor(idx.toString())!;
                    runningTotalCost += bill.getTotalCost();
                    const rectY = y(runningTotalCost);
                    const fillColor = color(props.simulations[idx].name);

                    return (
                      <Bar
                        key={`bar-${month}-${idx}-${billIdx}`}
                        x={rectX}
                        y={rectY}
                        width={xMinor.bandwidth()}
                        height={y(0) - y(bill.getTotalCost())}
                        fill={
                          bill.getFuelType() == "electricity"
                            ? fillColor
                            : `url(#lines-${fillColor})`
                        }
                      />
                    );
                  })}
                </Group>
              );
            })
          )}
          <AxisBottom
            top={height}
            scale={xMajor}
            tickFormat={monthTickFormat}
          />
          <AxisLeft scale={y} tickFormat={(v) => `\$${v}`} />
        </Group>
      </svg>
      <div style={{ marginLeft: margin.left }}>
        <LegendOrdinal
          scale={color}
          labelFormat={(name) => {
            for (let sim of props.simulations) {
              if (sim.name === name) {
                const total = sim.bills
                  .flatMap((b) => b.getTotalCost())
                  .reduce((acc, x) => acc + x, 0);
                return `${name} (Total: \$${total.toFixed(2)})`;
              }
            }
          }}
        />
      </div>
      {/* TODO(jlfwong): billing info is shown in CCFs, which won't be meaningful for Canadians */}
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          // set this to random so it correctly updates with parent bounds
          key={Math.random()}
          top={tooltipTop}
          left={tooltipLeft}
        >
          {tooltipData.name}
          {tooltipData.bills.map((bill) => {
            if (bill.getTotalCost() === 0) return null;
            return (
              <>
                <div key={bill.getFuelType()} style={{ marginTop: 10 }}>
                  <u>{bill.getFuelType()} bill</u> <br />
                  <strong>Usage</strong>: {bill.getFuelUsage().toFixed(2)}{" "}
                  {bill.getFuelUnit()} <br />
                  <strong>Total</strong>: ${bill.getTotalCost().toFixed(2)}
                </div>
              </>
            );
          })}
        </TooltipInPortal>
      )}
    </ChartGroup>
  );
};
