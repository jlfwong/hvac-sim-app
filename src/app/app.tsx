import { DateTime } from "luxon";
import { AirConditioner } from "../lib/air-conditioner";
import {
  SimpleElectricalUtilityPlan,
  SimpleNaturalGasUtilityPlan,
} from "../lib/billing";
import { BuildingGeometry } from "../lib/building-geometry";
import { GasFurnace } from "../lib/furnace";
import { SimpleHVACSystem } from "../lib/hvac-system";
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

async function runSimulation(): Promise<HVACSimulationResult> {
  const ottawaData2023 = await fetchJSON<JSONWeatherEntry[]>(
    "/data/weather/2023-ottawa-era5.json"
  );

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

  const hvacSystem = new SimpleHVACSystem({
    coolingSetPointF: 75,
    coolingAppliance: ac,

    heatingSetPointF: 70,
    heatingAppliance: furnace,
  });

  const weatherSource = new JSONBackedHourlyWeatherSource(ottawaData2023);

  const utilityPlans = {
    electrical: new SimpleElectricalUtilityPlan({
      fixedCostPerMonth: 20,
      costPerKwh: 0.14,
    }),
    naturalGas: new SimpleNaturalGasUtilityPlan({
      fixedCostPerMonth: 22,
      costPerCcf: 1.2,
    }),
  };

  const options = { zone: "America/Toronto" };
  const localStartTime = DateTime.fromObject(
    {
      year: 2023,
      month: 1,
      day: 1,
    },
    options
  );
  const localEndTime = DateTime.fromObject(
    {
      year: 2023,
      month: 12,

      // TODO(jlfwong): Update the dataset to include the the full *local*
      // year, not the full UTC year. Then this can be 31.
      day: 30,
    },
    options
  ).endOf("day");

  return simulateBuildingHVAC({
    localStartTime,
    localEndTime,
    initialInsideAirTempF: 72.5,
    buildingGeometry,
    loadSources,
    hvacSystem,
    weatherSource,
    utilityPlans,
  });
}

import * as d3 from "d3";
import { AirSourceHeatPump, panasonicHeatPumpRatings } from "../lib/heatpump";

function renderTemperatures(simulationResult: HVACSimulationResult) {
  const data = simulationResult.timeSteps.map((snapshot) => ({
    date: snapshot.localTime.toJSDate(),
    insideAirTempF: snapshot.insideAirTempF,
    outsideAirTempF: snapshot.weather.outsideAirTempF,
  }));

  // Set the dimensions and margins of the graph
  const margin = { top: 10, right: 30, bottom: 100, left: 60 },
    width = 460 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

  // Append the svg object to the body of the page
  const svg = d3
    .select(document.body)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Add X axis --> it is a date format
  const x = d3
    .scaleTime()
    .domain(d3.extent(data, (d) => d.date) as [Date, Date])
    .range([0, width]);

  const xAxis = svg
    .append("g")
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x));

  // Rotate the text for the x-axis tick labels
  xAxis
    .selectAll("text")
    .style("text-anchor", "start")
    .attr("dx", "0.8em")
    .attr("dy", "0.15em")
    .attr("transform", "rotate(45)");

  // Add Y axis
  const y = d3
    .scaleLinear()
    .domain([
      d3.min(data, (d) =>
        Math.min(d.insideAirTempF, d.outsideAirTempF)
      ) as number,
      d3.max(data, (d) =>
        Math.max(d.insideAirTempF, d.outsideAirTempF)
      ) as number,
    ])
    .range([height, 0]);
  svg.append("g").call(d3.axisLeft(y));

  // Add the line
  svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "blue")
    .attr("stroke-width", 1.5)
    .attr(
      "d",
      d3
        .line<{ date: Date; insideAirTempF: number; outsideAirTempF: number }>()
        .x((d) => x(d.date))
        .y((d) => y(d.outsideAirTempF))
    );

  svg
    .append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "red")
    .attr("stroke-width", 1.5)
    .attr(
      "d",
      d3
        .line<{ date: Date; insideAirTempF: number; outsideAirTempF: number }>()
        .x((d) => x(d.date))
        .y((d) => y(d.insideAirTempF))
    );
}

function renderBilling(simulationResult: HVACSimulationResult) {
  let data = simulationResult.bills.electricity!.map((b, i) => {
    const electricity = simulationResult.bills.electricity![i];
    const gas = simulationResult.bills.naturalGas![i];
    return {
      date: electricity.getBillingPeriodStart(),
      gas: gas.getTotalCost(),
      electricity: electricity.getTotalCost(),
    };
  });

  const margin = { top: 20, right: 20, bottom: 70, left: 60 },
    width = 500 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

  // Append the SVG object to the body of the page
  const svg = d3
    .select(document.body)
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

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

  // Draw the x-axis
  svg
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x0));

  const currencyFormat = d3.format("$.0f");

  // Draw the y-axis
  svg
    .append("g")
    .attr("class", "y axis")
    .call(d3.axisLeft(y).tickFormat((d) => currencyFormat(d)));

  // Color scale for the bars
  const color = d3.scaleOrdinal(["electricity", "gas"], d3.schemeCategory10);

  // Draw the bars
  data.forEach((monthData, index) => {
    const monthGroup = svg
      .append("g")
      .attr("transform", `translate(${x0(monthData.date.toFormat("LLL"))},0)`);

    function renderBar(k: "electricity" | "gas") {
      monthGroup
        .data<{ date: DateTime; electricity: number; gas: number }>([monthData])
        .append("rect")
        .attr("x", (d, i) => x1(k) as number)
        .attr("y", (d) => y(monthData[k]))
        .attr("width", x1.bandwidth())
        .attr("height", (d) => height - y(monthData[k]))
        .attr("fill", (d, i) => color(k));
    }
    renderBar("electricity");
    renderBar("gas");
  });
}

function render(simulationResult: HVACSimulationResult) {
  renderTemperatures(simulationResult);
  renderBilling(simulationResult);
}

async function main() {
  const simulationResult = await runSimulation();

  console.log(
    "total gas bill",
    simulationResult.bills.naturalGas!.reduce((a, b) => a + b.getTotalCost(), 0)
  );
  console.log(
    "total electricity bill",
    simulationResult.bills.electricity!.reduce(
      (a, b) => a + b.getTotalCost(),
      0
    )
  );
  render(simulationResult);
}

main();
