import React from "react";
import { Group } from "@visx/group";
import { Bar } from "@visx/shape";
import { PatternLines } from "@visx/pattern";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { LegendOrdinal } from "@visx/legend";

import { scaleBand, scaleLinear, scaleOrdinal } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { GridRows } from "@visx/grid";
import { DateTime } from "luxon";
import { EnergyBill } from "../../lib/billing";
import { ChartGroup, ChartHeader } from "../chart";
import { useAtomValue } from "jotai";
import { simulationsAtom } from "../app-state/simulations-state";
import { Colors } from "./colors";
import { CUBIC_METER_PER_CCF } from "../../lib/units";
import { Stack, Text } from "@chakra-ui/react";

interface BillViewProps {
  bill: EnergyBill;
}

function capitalizeWord(word: string): string {
  return word.replace(/^./, (x) => x.toUpperCase());
}

function formatUsage(bill: EnergyBill): React.ReactNode {
  let usage = bill.getFuelUsage();
  let unit: React.ReactNode = bill.getFuelUnit();

  if (unit === "ccf") {
    usage = usage * CUBIC_METER_PER_CCF;
    unit = (
      <>
        m<sup>3</sup>
      </>
    );
  }

  const formattedUsage = usage.toLocaleString("en-CA", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

  return (
    <>
      {formattedUsage} {unit}
    </>
  );
}

const BillView: React.FC<BillViewProps> = ({ bill }) => {
  return (
    <>
      <Stack key={bill.getFuelType()} gap={0}>
        <Text>
          <u>{capitalizeWord(bill.getFuelType())} bill</u>
        </Text>
        <Text>
          <strong>Usage</strong>: {formatUsage(bill)}
        </Text>
        <Text>
          <strong>Total</strong>: ${bill.getTotalCost().toFixed(2)}
        </Text>
      </Stack>
    </>
  );
};

interface MonthlyBillingTooltipViewProps {
  name: string;
  bills: EnergyBill[];
}

const MonthlyBillingTooltipView: React.FC<MonthlyBillingTooltipViewProps> = (
  props
) => {
  const filteredBills = props.bills.filter((b) => b.getTotalCost() != 0);
  const grandTotal = props.bills.reduce((acc, b) => acc + b.getTotalCost(), 0);

  return (
    <Stack gap={"10px"}>
      <Text>{props.name}</Text>

      {filteredBills.map((bill, i) => (
        <BillView bill={bill} key={i} />
      ))}

      {filteredBills.length > 1 && (
        <Text>
          <strong>Grand total</strong>: ${grandTotal.toFixed(2)}
        </Text>
      )}
    </Stack>
  );
};

export const BillingView: React.FC = () => {
  const simulations = useAtomValue(simulationsAtom);

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<MonthlyBillingTooltipViewProps>();

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    detectBounds: true,
    scroll: true,
  });

  if (!simulations) return null;

  const margin = { top: 10, right: 20, bottom: 40, left: 60 },
    width = 430 - margin.left - margin.right,
    height = 200 - margin.top - margin.bottom;

  const monthKey = (date: DateTime) => date.toFormat("yyyy-LL");

  let dateRange = simulations
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

  const allBills: { [key: string]: EnergyBill[] }[] = simulations.map((sim) => {
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
  });

  const xMajor = scaleBand<string>({
    domain: xAxisDomain,
    paddingInner: 0.2,
    paddingOuter: 0.2,
    range: [0, width],
  });

  const xMinor = scaleBand<string>({
    domain: simulations.map((_, i) => i.toString()),
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

  const color = scaleOrdinal<string, string>()
    .domain(simulations.map((s) => s.name))
    .range([Colors.heatpump, Colors.statusQuo]);

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
        name: simulations[simIdx].name,
        bills: allBills[simIdx][monthKey],
      },
    });
  };

  const monthTickFormat = (value: string): string => {
    return DateTime.fromObject({
      year: parseInt(value.split("-")[0]),
      month: parseInt(value.split("-")[1]),
    }).toFormat("LLL");
  };

  return (
    <ChartGroup>
      <ChartHeader>Monthly Utility Bills for Heating and Cooling</ChartHeader>
      <svg
        viewBox={`0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`}
        style={{ width: "100%", height: "auto" }}
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
                  key={`group-${month}-${idx}`}
                  onMouseOver={(ev) => handleMouseOver(ev, idx, month)}
                  onMouseOut={hideTooltip}
                >
                  {bills.map((bill, billIdx) => {
                    const rectX = xMajor(month)! + xMinor(idx.toString())!;
                    runningTotalCost += bill.getTotalCost();
                    const rectY = y(runningTotalCost);
                    const fillColor = color(simulations[idx].name);

                    return (
                      <Bar
                        key={`bar-${month}-${idx}-${billIdx}`}
                        x={rectX}
                        y={rectY}
                        width={xMinor.bandwidth()}
                        height={y(0) - y(bill.getTotalCost())}
                        fill={fillColor}
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
          <AxisLeft numTicks={4} scale={y} tickFormat={(v) => `\$${v}`} />
        </Group>
      </svg>
      <div style={{ marginLeft: margin.left }}>
        <LegendOrdinal scale={color} />
      </div>
      {/* TODO(jlfwong): billing info is shown in CCFs, which won't be meaningful for Canadians */}
      {tooltipOpen && tooltipData && (
        <TooltipInPortal
          // set this to random so it correctly updates with parent bounds
          key={Math.random()}
          top={tooltipTop}
          left={tooltipLeft}
        >
          <MonthlyBillingTooltipView {...tooltipData} />
        </TooltipInPortal>
      )}
    </ChartGroup>
  );
};
