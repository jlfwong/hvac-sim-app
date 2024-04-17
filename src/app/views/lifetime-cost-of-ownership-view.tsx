import { useAtom, useAtomValue } from "jotai";
import { Text } from "@chakra-ui/react";
import {
  bestHeatPumpSimulationResultAtom,
  statusQuoSimulationResultAtom,
} from "../app-state/simulations-state";
import React, { useMemo, useState } from "react";
import { ChartGroup, ChartHeader } from "../chart";
import { scaleBand, scaleLinear, scaleOrdinal, scaleUtc } from "@visx/scale";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Bar, Circle, Line, LinePath } from "@visx/shape";
import { curveStepAfter, curveStepBefore } from "@visx/curve";
import { Group } from "@visx/group";
import {
  equipmentLifetimeYears,
  heatpumpLifetimeCostAtom,
  statusQuoFurnaceInstallCostAtom,
  statusQuoLifetimeCostAtom,
  systemComparisonAtom,
} from "../app-state/system-comparison";
import {
  heatpumpInstallCostAtom,
  airConditionerInstallCostAtom,
} from "../app-state/config-state";
import { DateTime } from "luxon";
import { LegendOrdinal } from "@visx/legend";
import { GridRows } from "@visx/grid";
import { useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { bisector } from "@visx/vendor/d3-array";
import { localPoint } from "@visx/event";
import { Colors } from "./colors";

const bisectSeries = bisector<[Date, number], Date>((d) => d[0]).right;

interface LifetimeCostOfOwnershipTooltip {
  date: Date;
  heatPumpCost: number;
  statusQuoCost: number;
}

export const LifetimeCostOfOwnershipView: React.FC<{}> = (props) => {
  const systemComparison = useAtomValue(systemComparisonAtom);

  const heatpumpInstallCost = useAtomValue(heatpumpInstallCostAtom);
  const statusQuoFurnaceInstallCost = useAtomValue(
    statusQuoFurnaceInstallCostAtom
  );
  const airConditionerInstallCost = useAtomValue(airConditionerInstallCostAtom);

  const bestHeatPumpSimulationResult = useAtomValue(
    bestHeatPumpSimulationResultAtom
  );
  const statusQuoSimulationResult = useAtomValue(statusQuoSimulationResultAtom);

  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip<LifetimeCostOfOwnershipTooltip>();

  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    detectBounds: true,
    scroll: true,
  });

  if (
    systemComparison == null ||
    heatpumpInstallCost == null ||
    bestHeatPumpSimulationResult == null ||
    statusQuoFurnaceInstallCost == null ||
    airConditionerInstallCost == null ||
    statusQuoSimulationResult == null ||
    bestHeatPumpSimulationResult == null
  ) {
    return null;
  }

  function year(n: number): Date {
    return DateTime.utc(DateTime.utc().year + n).toJSDate();
  }

  const [heatPumpSeries, statusQuoSeries] = useMemo(() => {
    const heatPumpSeries: [Date, number][] = [
      [year(0), 0],
      [year(0), heatpumpInstallCost],
    ];
    const statusQuoSeries: [Date, number][] = [
      [year(0), 0],
      [year(0), statusQuoFurnaceInstallCost + airConditionerInstallCost],
    ];

    let hp = heatPumpSeries[1][1];
    let sq = statusQuoSeries[1][1];
    const startYear = DateTime.utc().year;

    const sortedHPBills = [...bestHeatPumpSimulationResult.bills].sort(
      (a, b) =>
        a.getBillingPeriodEnd().toMillis() - b.getBillingPeriodEnd().toMillis()
    );
    const sortedSQBills = [...statusQuoSimulationResult.bills].sort(
      (a, b) =>
        a.getBillingPeriodEnd().toMillis() - b.getBillingPeriodEnd().toMillis()
    );

    for (let i = 0; i <= equipmentLifetimeYears; i++) {
      const year = startYear + i;
      for (let bill of sortedHPBills) {
        hp += bill.getTotalCost();
        heatPumpSeries.push([
          bill.getBillingPeriodEnd().set({ year }).toUTC().toJSDate(),
          hp,
        ]);
      }

      for (let bill of sortedSQBills) {
        sq += bill.getTotalCost();
        statusQuoSeries.push([
          bill.getBillingPeriodEnd().set({ year }).toUTC().toJSDate(),
          sq,
        ]);
      }
    }

    return [heatPumpSeries, statusQuoSeries];
  }, [
    heatpumpInstallCost,
    statusQuoFurnaceInstallCost,
    airConditionerInstallCost,
    bestHeatPumpSimulationResult,
    statusQuoSimulationResult,
  ]);

  const margin = { top: 10, right: 30, bottom: 40, left: 60 },
    width = 430 - margin.left - margin.right,
    height = 200 - margin.top - margin.bottom;

  const x = scaleUtc<number>({
    domain: [
      year(-1),
      DateTime.fromJSDate(heatPumpSeries[heatPumpSeries.length - 1][0])
        .plus({ years: 1 })
        .toJSDate(),
    ],
    range: [0, width],
  }).nice();

  const names = [
    bestHeatPumpSimulationResult.name,
    statusQuoSimulationResult.name,
  ];

  const y = scaleLinear({
    domain: [
      0,
      Math.max(
        heatPumpSeries[heatPumpSeries.length - 1][1],
        statusQuoSeries[statusQuoSeries.length - 1][1]
      ),
    ],
    range: [height, 0],
  }).nice();

  const color = scaleOrdinal<string, string>()
    .domain(names)
    .range([Colors.heatpump, Colors.statusQuo]);
  const hpColor = color(bestHeatPumpSimulationResult.name);
  const sqColor = color(statusQuoSimulationResult.name);

  const handleMouseMove: React.EventHandler<React.MouseEvent> = (ev) => {
    const domSpaceRect = ev.currentTarget.getBoundingClientRect();
    const svgSpaceMouse = {
      x:
        (ev.nativeEvent.offsetX * (margin.left + width + margin.right)) /
        domSpaceRect.width,
      y:
        (ev.nativeEvent.offsetY * (margin.top + height + margin.bottom)) /
        domSpaceRect.height,
    };

    const groupSpaceX = svgSpaceMouse.x - margin.left;
    const groupSpaceY = svgSpaceMouse.y - margin.top;
    const date = DateTime.utc(
      DateTime.fromJSDate(x.invert(groupSpaceX)).toUTC().year
    ).toJSDate();

    const hpIdx = bisectSeries(heatPumpSeries, date);
    const hp = heatPumpSeries[Math.min(heatPumpSeries.length - 1, hpIdx)];

    const sqIdx = bisectSeries(statusQuoSeries, date);
    const sq = statusQuoSeries[Math.min(statusQuoSeries.length - 1, sqIdx)];

    const groupSpaceTooltipX = x(hp[0]);

    const svgSpaceTooltipX =
      ((groupSpaceTooltipX + margin.left) * domSpaceRect.width) /
      (margin.left + width + margin.right);

    const tt = {
      tooltipTop: 0,
      tooltipLeft: svgSpaceTooltipX,
      tooltipData: {
        date: hp[0],
        heatPumpCost: hp[1],
        statusQuoCost: sq[1],
      },
    };

    showTooltip(tt);
  };

  return (
    <ChartGroup>
      <ChartHeader>Total Cost over Time</ChartHeader>
      <svg
        viewBox={`0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`}
        style={{ width: "100%", height: "auto", background: "white" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={hideTooltip}
        ref={containerRef}
      >
        <Group left={margin.left} top={margin.top}>
          <GridRows scale={y} width={width} />
          {tooltipOpen && tooltipData && (
            <Line
              from={{ x: x(tooltipData.date), y: 0 }}
              to={{ x: x(tooltipData.date), y: height }}
              stroke={"#eaf0f6"}
              strokeWidth={2}
            />
          )}
          <LinePath
            data={heatPumpSeries}
            x={(d) => x(d[0])}
            y={(d) => y(d[1])}
            stroke={hpColor}
            strokeWidth={2}
            curve={curveStepAfter}
          />
          <LinePath
            data={statusQuoSeries}
            x={(d) => x(d[0])}
            y={(d) => y(d[1])}
            stroke={sqColor}
            strokeWidth={2}
            curve={curveStepAfter}
          />
          <AxisBottom top={height} scale={x} />
          <AxisLeft
            numTicks={4}
            scale={y}
            tickFormat={(t) => `\$${t.toLocaleString()}`}
          />
          {tooltipOpen && tooltipData && (
            <Group>
              <Circle
                cx={x(tooltipData.date)}
                cy={y(tooltipData.heatPumpCost)}
                r={5}
                fill={color(bestHeatPumpSimulationResult.name)}
              />
              <Circle
                cx={x(tooltipData.date)}
                cy={y(tooltipData.statusQuoCost)}
                r={5}
                fill={color(statusQuoSimulationResult.name)}
              />
            </Group>
          )}
        </Group>
      </svg>

      <div style={{ marginLeft: margin.left }}>
        <LegendOrdinal scale={color} />
      </div>
      {tooltipOpen &&
        tooltipData &&
        tooltipTop != null &&
        tooltipLeft != null && (
          <TooltipInPortal
            key={Math.random()}
            top={tooltipTop - 12}
            left={tooltipLeft}
          >
            <div>
              {DateTime.fromJSDate(tooltipData.date).toUTC().toFormat("yyyy")}
            </div>
            <Text color={hpColor}>
              $
              {tooltipData.heatPumpCost.toLocaleString("en-CA", {
                maximumSignificantDigits: 3,
              })}
            </Text>
            <Text color={sqColor}>
              $
              {tooltipData.statusQuoCost.toLocaleString("en-CA", {
                maximumSignificantDigits: 3,
              })}
            </Text>
          </TooltipInPortal>
        )}
    </ChartGroup>
  );
};
