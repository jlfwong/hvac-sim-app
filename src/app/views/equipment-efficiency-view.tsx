import React from "react";
import { Group } from "@visx/group";
import { LinePath, Bar, Line } from "@visx/shape";
import { scaleUtc, scaleLinear, scaleOrdinal } from "@visx/scale";
import { AxisLeft, AxisBottom } from "@visx/axis";
import { Grid, GridRows } from "@visx/grid";
import { HVACSimulationResult } from "../../lib/simulate";
import {
  BTU_PER_CCF_NATURAL_GAS,
  CUBIC_METER_PER_CCF,
  btusToKwh,
  fahrenheitToCelcius,
} from "../../lib/units";
import { ChartGroup, ChartHeader } from "../chart";
import { LegendOrdinal } from "@visx/legend";
import { selectedHeatpumpsAtom } from "../app-state/selected-heatpumps-state";
import { useAtom, useAtomValue } from "jotai";
import {
  airConditionerAtom,
  electricFurnaceAtom,
  gasFurnaceAtom,
} from "../app-state/equipment-state";
import {
  electricityPricePerKwhAtom,
  naturalGasPricePerCubicMetreAtom,
} from "../app-state/canadian-utilities-state";
import { weatherInfoAtom } from "../app-state/canadian-weather-state";
import { loadSourcesAtom } from "../app-state/loads-state";
import {
  auxSwitchoverTempCAtom,
  coolingSetPointFAtom,
  heatingSetPointFAtom,
} from "../app-state/config-state";
import { worstCaseThermalLoadBtusPerHour } from "../../lib/select-heatpump";
import { schemeSet1 } from "d3-scale-chromatic";

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

type EfficiencyDatum = { outsideAirTempF: number; costPerMMBtu: number };

export const EquipmentEfficiencyView: React.FC<{}> = () => {
  // Set the dimensions and margins of the graph
  const margin = { top: 10, right: 30, bottom: 30, left: 100 },
    width = 860 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  const selectedHeatpumps = useAtomValue(selectedHeatpumpsAtom);
  const gasFurnace = useAtomValue(gasFurnaceAtom);
  const electricFurnace = useAtomValue(electricFurnaceAtom);
  const airConditioner = useAtomValue(airConditionerAtom);
  const weatherInfo = useAtomValue(weatherInfoAtom);
  const loadSources = useAtomValue(loadSourcesAtom);
  const heatingSetPointF = useAtomValue(heatingSetPointFAtom);
  const coolingSetPointF = useAtomValue(coolingSetPointFAtom);
  const auxSwitchoverTempC = useAtomValue(auxSwitchoverTempCAtom);

  const electricityPricePerKwh = useAtomValue(electricityPricePerKwhAtom);
  const naturalGasPricePerCubicMetre = useAtomValue(
    naturalGasPricePerCubicMetreAtom
  );

  if (
    !selectedHeatpumps ||
    !gasFurnace ||
    !electricFurnace ||
    !airConditioner ||
    !electricityPricePerKwh ||
    !naturalGasPricePerCubicMetre ||
    !weatherInfo ||
    !auxSwitchoverTempC ||
    loadSources == null
  ) {
    return null;
  }

  // TODO(jlfwong): move computation into jotai
  const temperaturesAndLoads: {
    outsideAirTempF: number;
    btusPerHourNeeded: number;
  }[] = [];
  weatherInfo.binnedTemperatures.forEachBin(({ outsideAirTempF }) => {
    if (outsideAirTempF < heatingSetPointF) {
      // The Math.max(0 is here because there are situations where it's colder
      // outside than inside, but the thermal load on the house is still
      // positive. This could happen if e.g. it's very slightly colder outside
      // than inside, but the activity of the occupants heats the house enough
      // to not need any HVAC equipment to be used.
      //
      // Ignore these cases for the purposes of displaying equipment efficiency.
      const btusPerHourNeeded = Math.max(
        0,
        -worstCaseThermalLoadBtusPerHour({
          insideAirTempF: heatingSetPointF,
          outsideAirTempF,
          loadSources,
        })
      );
      temperaturesAndLoads.push({ outsideAirTempF, btusPerHourNeeded });
    } else if (outsideAirTempF > coolingSetPointF) {
      const btusPerHourNeeded = -worstCaseThermalLoadBtusPerHour({
        insideAirTempF: coolingSetPointF,
        outsideAirTempF,
        loadSources,
      });
      temperaturesAndLoads.push({ outsideAirTempF, btusPerHourNeeded });
    } else {
      temperaturesAndLoads.push({ outsideAirTempF, btusPerHourNeeded: 0 });
    }
  });

  let maxCostPerMMBtu = 0;

  const gasFurnaceCostByTemperature = temperaturesAndLoads
    .map<EfficiencyDatum | null>(({ outsideAirTempF, btusPerHourNeeded }) => {
      if (btusPerHourNeeded <= 0) {
        // No heating needed
        return null;
      }
      const perfInfo = gasFurnace.getHeatingPerformanceInfo({
        insideAirTempF: heatingSetPointF,
        outsideAirTempF,
      });
      if (perfInfo.btusPerHour < btusPerHourNeeded) {
        // Gas furnace has insufficient capacity
        return null;
      }

      const cyclingNaturalGasCcfPerHour =
        perfInfo.fuelUsage.naturalGasCcfPerHour! *
        (btusPerHourNeeded / perfInfo.btusPerHour);
      const cyclingCostPerHour =
        cyclingNaturalGasCcfPerHour *
        CUBIC_METER_PER_CCF *
        naturalGasPricePerCubicMetre;

      const costPerMMBtu = 1e6 * (cyclingCostPerHour / btusPerHourNeeded);
      maxCostPerMMBtu = Math.max(costPerMMBtu, maxCostPerMMBtu);

      return {
        outsideAirTempF,
        costPerMMBtu,
      };
    })
    .filter(notEmpty);

  const electricFurnaceCostByTemperature = temperaturesAndLoads
    .map<EfficiencyDatum | null>(({ outsideAirTempF, btusPerHourNeeded }) => {
      if (btusPerHourNeeded <= 0) {
        // No heating needed
        return null;
      }
      const perfInfo = electricFurnace.getHeatingPerformanceInfo({
        insideAirTempF: heatingSetPointF,
        outsideAirTempF,
      });
      if (perfInfo.btusPerHour < btusPerHourNeeded) {
        // Gas furnace has insufficient capacity
        return null;
      }

      const cyclingElectricFurnaceKwhPerHour =
        perfInfo.fuelUsage.electricityKw! *
        (btusPerHourNeeded / perfInfo.btusPerHour);
      const cyclingCostPerHour =
        cyclingElectricFurnaceKwhPerHour * electricityPricePerKwh;

      const costPerMMBtu = 1e6 * (cyclingCostPerHour / btusPerHourNeeded);
      maxCostPerMMBtu = Math.max(costPerMMBtu, maxCostPerMMBtu);

      return {
        outsideAirTempF,
        costPerMMBtu,
      };
    })
    .filter(notEmpty);

  const heatpumps = selectedHeatpumps.slice(0, 1);

  const heatpumpCostsByTemperature = heatpumps.map<EfficiencyDatum[]>((hp) => {
    const { heatpump } = hp;

    return temperaturesAndLoads
      .map(({ outsideAirTempF, btusPerHourNeeded }) => {
        if (btusPerHourNeeded === 0) {
          return null;
        }

        const mode = btusPerHourNeeded > 0 ? "heating" : "cooling";

        if (mode === "cooling") {
          // TODO(jlfwong): Deal with cooling separately
          return null;
        }

        const rating = heatpump.getEstimatedPerformanceRating({
          power: { type: "btus", btusPerHourNeeded },
          mode,
          insideAirTempF:
            mode == "heating" ? heatingSetPointF : coolingSetPointF,
          outsideAirTempF,
        });

        if (Math.abs(rating.btusPerHour) < Math.abs(btusPerHourNeeded)) {
          // Not enough power!
          return null;
        }

        const kWNeededCycling =
          (btusToKwh(Math.abs(rating.btusPerHour)) /
            rating.coefficientOfPerformance) *
          (btusPerHourNeeded / rating.btusPerHour);

        const costPerHour = kWNeededCycling * electricityPricePerKwh;
        const costPerMMBtu = 1e6 * (costPerHour / Math.abs(btusPerHourNeeded));
        maxCostPerMMBtu = Math.max(costPerMMBtu, maxCostPerMMBtu);

        return {
          outsideAirTempF,
          costPerMMBtu,
        };
      })
      .filter(notEmpty);
  });

  const xScale = scaleLinear({
    domain: [
      fahrenheitToCelcius(temperaturesAndLoads[0].outsideAirTempF),
      fahrenheitToCelcius(
        temperaturesAndLoads[temperaturesAndLoads.length - 1].outsideAirTempF
      ),
    ],
    range: [0, width],
  }).nice();

  const yScale = scaleLinear({
    domain: [0, maxCostPerMMBtu],
    range: [height, 0],
  }).nice();

  const resultsToPlot: { [name: string]: EfficiencyDatum[] } = {};
  resultsToPlot[gasFurnace.name] = gasFurnaceCostByTemperature;
  resultsToPlot[electricFurnace.name] = electricFurnaceCostByTemperature;
  heatpumps.forEach((hp, i) => {
    resultsToPlot[hp.heatpump.name] = heatpumpCostsByTemperature[i];
  });

  const color = scaleOrdinal<string, string>()
    .domain(Object.keys(resultsToPlot))
    .range(schemeSet1);

  return (
    <ChartGroup>
      <ChartHeader>
        Equipment Efficiency ($/MMBtu v.s. Outside Air Temperature)
      </ChartHeader>
      <svg
        width={width + margin.left + margin.right}
        height={height + margin.top + margin.bottom}
      >
        <Group left={margin.left} top={margin.top}>
          <Grid xScale={xScale} yScale={yScale} height={height} width={width} />
          <Line
            from={{ x: xScale(auxSwitchoverTempC), y: yScale.range()[0] }}
            to={{ x: xScale(auxSwitchoverTempC), y: yScale.range()[1] }}
            strokeWidth={3}
            stroke={"red"}
          />
          {Object.keys(resultsToPlot).map((key) => {
            return (
              <LinePath
                data={resultsToPlot[key]}
                key={key}
                x={(r) => xScale(fahrenheitToCelcius(r.outsideAirTempF))}
                y={(r) => yScale(r.costPerMMBtu)}
                stroke={color(key) ?? "red"}
                strokeWidth={3}
              />
            );
          })}
          <AxisBottom
            scale={xScale}
            top={height}
            tickFormat={(temp) => `${(+temp).toFixed(0)}°C`}
          />
          <AxisLeft scale={yScale} tickFormat={(c) => `\$${(+c).toFixed(2)}`} />
        </Group>
      </svg>
      <div style={{ marginLeft: margin.left }}>
        <LegendOrdinal scale={color} />
      </div>
    </ChartGroup>
  );
};
