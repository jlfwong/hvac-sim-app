import { createRoot } from "react-dom/client";

import { DateTime } from "luxon";
import { AirConditioner } from "../lib/air-conditioner";
import {
  SimpleElectricalUtilityPlan,
  SimpleNaturalGasUtilityPlan,
} from "../lib/billing";
import { BuildingGeometry } from "../lib/building-geometry";
import { GasFurnace } from "../lib/furnace";
import {
  DualFuelTwoStageHVACSystem,
  HVACSystem,
  SimpleHVACSystem,
} from "../lib/hvac-system";
import {
  ThermalLoadSource,
  OccupantsLoadSource,
  SolarGainLoadSource,
  ConductionConvectionLoadSource,
  InfiltrationLoadSource,
} from "../lib/thermal-loads";
import {
  JSONBackedHourlyWeatherSource,
  JSONWeatherEntry,
  WeatherSource,
} from "../lib/weather";
import { HVACSimulationResult, simulateBuildingHVAC } from "../lib/simulate";

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url);
  // Check if the response is ok (status in the range 200-299)
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return await response.json(); // Parse the response body as JSON
}

const buildingGeometry = new BuildingGeometry({
  floorSpaceSqFt: 3000,
  ceilingHeightFt: 9,
  numAboveGroundStories: 2,
  lengthToWidthRatio: 3,
  hasConditionedBasement: true,
});

const loadSources: ThermalLoadSource[] = [
  new OccupantsLoadSource(2),

  // TODO(jlfwong): these are a bit weird to have separately because they have
  // to share geometry & modifiers. Would perhaps be alleviated by having a
  // function to return standard loads for a building?
  new SolarGainLoadSource({ geometry: buildingGeometry, solarModifier: 1.0 }),
  new ConductionConvectionLoadSource({
    geometry: buildingGeometry,
    envelopeModifier: 0.65,
  }),
  new InfiltrationLoadSource({
    geometry: buildingGeometry,
    envelopeModifier: 0.65,
  }),
];

const heatpump = new AirSourceHeatPump({
  elevationFeet: 0,
  ratings: panasonicHeatPumpRatings,
});

const ac = new AirConditioner({
  seer: 11,
  capacityBtusPerHour: 40000,
  elevationFeet: 0,
  speedSettings: "single-speed",
});

const furnace = new GasFurnace({
  afuePercent: 96,
  capacityBtusPerHour: 80000,
  elevationFeet: 0,
});

function runSimulation(options: {
  hvacSystem: HVACSystem;
  weatherSource: WeatherSource;
}): HVACSimulationResult {
  console.log("Running simulation");
  const dtOptions = { zone: "America/Toronto" };
  const localStartTime = DateTime.fromObject(
    {
      year: 2023,
      month: 1,
      day: 1,
    },
    dtOptions
  );
  const localEndTime = DateTime.fromObject(
    {
      year: 2023,
      month: 12,

      // TODO(jlfwong): Update the dataset to include the the full *local*
      // year, not the full UTC year. Then this can be 31.
      day: 30,
    },
    dtOptions
  ).endOf("day");

  const utilityPlans = {
    electrical: new SimpleElectricalUtilityPlan({
      fixedCostPerMonth: 20,
      costPerKwh: 0.1368,
    }),
    naturalGas: new SimpleNaturalGasUtilityPlan({
      fixedCostPerMonth: 22,
      costPerCcf: 1.19 + 0.42,
    }),
  };

  return simulateBuildingHVAC({
    localStartTime,
    localEndTime,
    initialInsideAirTempF: 72.5,
    buildingGeometry,
    hvacSystem: options.hvacSystem,
    loadSources,
    weatherSource: options.weatherSource,
    utilityPlans,
  });
}

import * as d3 from "d3";
import { AirSourceHeatPump, panasonicHeatPumpRatings } from "../lib/heatpump";
import { fahrenheitToCelcius } from "../lib/units";
import React, { useEffect, useRef } from "react";

const TemperaturesView: React.FC<{ simulationResult: HVACSimulationResult }> = (
  props
) => {
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

const BillingView: React.FC<{ simulationResult: HVACSimulationResult }> = (
  props
) => {
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
  const x0 = d3
    .scaleBand()
    .paddingInner(0.1)
    .domain(data.map((d) => d.date.toFormat("LLL")))
    .rangeRound([0, width]);

  // Set up the scale for each group's items
  const x1 = d3
    .scaleBand()
    .padding(0.05)
    .domain(["gas", "electricity"]) // Assuming each month has the same number of bills
    .rangeRound([0, x0.bandwidth()]);

  // Set up the y-axis scale
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d) => Math.max(d.gas, d.electricity)) as number])
    .rangeRound([height, 0]);

  const xAxisRef = useRef<SVGGElement | null>(null);
  const yAxisRef = useRef<SVGGElement | null>(null);

  const currencyFormat = d3.format("$.0f");

  useEffect(() => {
    if (!xAxisRef.current || !yAxisRef.current) {
      return;
    }

    d3.select(xAxisRef.current).call(d3.axisBottom(x0));

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
            const bars: React.ReactNode[] = [];
            for (let k of ["electricity", "gas"]) {
              bars.push(
                <rect
                  x={x1(k)}
                  y={y(monthData[k])}
                  width={x1.bandwidth()}
                  height={height - y(monthData[k])}
                  fill={color(k)}
                />
              );
            }
            return (
              <g transform={`translate(${x0(monthData.date.toFormat("LLL"))})`}>
                {bars}
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

/*
function render(simulationResult: HVACSimulationResult) {
  renderTemperatures(simulationResult);
  renderBilling(simulationResult);


  console.log("total gas bill", totalGas);
  console.log("total electricity bill", totalElectricity);
  console.log("grand total", totalGas + totalElectricity);
}
*/

async function main() {
  const ottawaData2023 = await fetchJSON<JSONWeatherEntry[]>(
    "/data/weather/2023-ottawa-era5.json"
  );

  const rootNode = document.createElement("div");
  document.body.appendChild(rootNode);
  const root = createRoot(rootNode);

  const coolingSetPointF = 80;
  const heatingSetPointF = 70;

  const weatherSource = new JSONBackedHourlyWeatherSource(ottawaData2023);

  for (let i = 50; i > -10; i--) {
    const simulationResult = runSimulation({
      weatherSource,
      hvacSystem: new DualFuelTwoStageHVACSystem({
        coolingSetPointF,
        coolingAppliance: ac,

        heatingSetPointF: 70,
        heatingAppliance: heatpump,

        auxSwitchoverTempF: i,
        auxHeatingAppliance: furnace,

        // Like the "Compressor Stage 1 Max Runtime" setting in
        // ecobee
        stage1MaxDurationMinutes: 120,

        // Like the "Compressor Stage 2 Temperature Delta" setting
        // in ecobee
        stage2TemperatureDeltaF: 1,
      }),
    });

    root.render(
      <div>
        <TemperaturesView simulationResult={simulationResult} />
        <BillingView simulationResult={simulationResult} />
      </div>
    );

    await new Promise((res) => setTimeout(res, 100));
  }
}

main();
