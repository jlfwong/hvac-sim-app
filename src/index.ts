// TODO(jlfwong): Break these up appropriately. For now just trying to establish the interfaces I want.
// TODO(jlfwong): Set up prettier, tsc, jest

type Quantity<UnitT> = { value: number; units: UnitT };

function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

function lastOf<T>(xs: T[]): T | null {
  return xs[xs.length - 1] || null;
}

type TemperatureUnits = "celcius" | "fahrenheit";
type Temperature = Quantity<TemperatureUnits>;
function celcius(t: Temperature): number {
  if (t.units === "celcius") return t.value;
  else if (t.units === "fahrenheit") return (t.value - 32) / 1.8;
  assertNever(t.units);
}

function fahrenheit(t: Temperature): number {
  if (t.units === "celcius") return (t.value / 1.8) * 32;
  else if (t.units === "fahrenheit") return t.value;
  assertNever(t.units);
}

type EnergyUnits = "btu" | "kWh" | "GJ";
type EnergyAmount = Quantity<EnergyUnits>;
function BTU(e: EnergyAmount): number {}
function kWh(e: EnergyAmount): number {}
function GJ(e: EnergyAmount): number {}

type PowerUnits = "btu/hr" | "kW";
type PowerAmount = Quantity<PowerUnits>;

type Fuel = "electricity" | "natural gas" | "fuel oil" | "propane";
type ElectricalUnits = "kWh";
type NaturalGasUnits = "ccf" | "m3" | "therm";
type FuelOilUnits = "gallon";
type PropaneUnits = "gallon";

type UnitsForFuel<FuelT extends Fuel> = FuelT extends "electricity"
  ? ElectricalUnits
  : FuelT extends "natural gas"
  ? NaturalGasUnits
  : FuelT extends "fuel oil"
  ? FuelOilUnits
  : FuelT extends "propane"
  ? PropaneUnits
  : never;

interface FuelAmount<FuelT extends Fuel> extends Quantity<UnitsForFuel<FuelT>> {
  type: FuelT;
}

type Currency = "USD" | "CAD";
type MoneyAmount = Quantity<Currency>;

type Percent = Quantity<"%">;

type SpeedUnits = "mph" | "kph";
type WindSpeed = Quantity<SpeedUnits>;

type IrradiationUnits = "W/m^2";
type Irradiation = Quantity<IrradiationUnits>;

type AngleUnit = "deg" | "rad";
type Angle = Quantity<AngleUnit>;

interface Bill<FuelT extends Fuel> {
  constructor(fuel: FuelT, localStartDate: Date, localEndDate: Date);
  addUsage(localTime: Date, amount: FuelAmount<FuelT>): void;
  predictIncrementalCostOfUsage(
    date: Date,
    amount: FuelAmount<FuelT>
  ): MoneyAmount;
  getTotal(): MoneyAmount;
}

type BillSet = {
  electricity: Bill<"electricity">;
  naturalGas: Bill<"natural gas">;
  fuelOil: Bill<"fuel oil">;
  propane: Bill<"propane">;
};

interface UtilitySet {
  createNewBillSet(localStartDate: Date, localEndDate: Date): BillSet;
}

type SolarIrradiation = { angle: Angle; irradiation: Irradiation };

interface EnvironmentalConditions {
  outsideAirTemperature: Temperature;
  insideAirTemperature: Temperature;
  relativeHumidity: Percent;
  windSpeed: WindSpeed;
  cloudCover: Percent;
  solarIrradiation: SolarIrradiation;
}

interface WeatherService {
  getTemperature(localDateTime: Date): Temperature | null;
  getRelativeHumidity(localDateTime: Date): Percent | null;
  getWindSpeed(localDateTime: Date): WindSpeed | null;
  getCloudCover(localDateTime: Date): Percent | null;
  getSolarIrradiation(localDateTime: Date): SolarIrradiation | null;
}

type ThermalLoad = { type: "heating" | "cooling"; amount: PowerAmount };
interface ThermalLoadSource {
  getThermalLoad(
    localDateTime: Date,
    conditions: EnvironmentalConditions
  ): ThermalLoad;
}
function invertThermalLoad(load: ThermalLoad): ThermalLoad {
  const { type, amount } = load;
  if (type === "heating") {
    return { type: "cooling", amount };
  } else if (type == "cooling") {
    return { type: "heating", amount };
  }
  assertNever(type);
}

interface EquipmentResponse {
  thermalResponse: ThermalLoad;
  fuelUsagePerHour: FuelAmount<Fuel>[];
}

interface Equipment {
  // TODO(jlfwong): This interface wouldn't work correctly for ground-sourced
  // heat-pumps
  simulateThermalResponse(
    responseNeeded: ThermalLoad,
    insideAirTemperature: Temperature,
    outsideAirTemperature: Temperature
  ): EquipmentResponse;
}

interface VariableCapacityHeatPumpPerformanceRating {
  minCapacity: HeatPumpPerformanceRating;
  maxCapacity: HeatPumpPerformanceRating;
}

interface HeatPumpPerformanceRating {
  btuPerHour: number;
  coefficientOfPerformance: number;
}

// A line item from the NEEP cold-climate air-sourced heat pump database
interface NEEPccASHPRatingInfo {
  mode: "heating" | "cooling";
  indoorDryBulbFahrenheit: number;
  outdoorDryBulbFahrenheit: number;
  minCapacity: HeatPumpPerformanceRating;
  maxCapacity: HeatPumpPerformanceRating;
}

function interpolate(
  x: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
}

function interpolatePerformanceRating(
  deltaT: number,
  aDeltaT: number,
  a: HeatPumpPerformanceRating,
  bDeltaT: number,
  b: HeatPumpPerformanceRating
): HeatPumpPerformanceRating {
  return {
    btuPerHour: interpolate(
      deltaT,
      aDeltaT,
      a.btuPerHour,
      bDeltaT,
      b.btuPerHour
    ),
    coefficientOfPerformance: interpolate(
      deltaT,
      aDeltaT,
      a.coefficientOfPerformance,
      bDeltaT,
      b.coefficientOfPerformance
    ),
  };
}

function interpolateVariableCapacityPerformanceRating(
  x: number,
  x1: number,
  y1: NEEPccASHPRatingInfo,
  x2: number,
  y2: NEEPccASHPRatingInfo
): VariableCapacityHeatPumpPerformanceRating {
  return {
    minCapacity: interpolatePerformanceRating(
      x,
      x1,
      y1.minCapacity,
      x2,
      y2.minCapacity
    ),
    maxCapacity: interpolatePerformanceRating(
      x,
      x1,
      y1.maxCapacity,
      x2,
      y2.maxCapacity
    ),
  };
}

function absDeltaT(r: NEEPccASHPRatingInfo): number {
  return Math.abs(r.indoorDryBulbFahrenheit - r.outdoorDryBulbFahrenheit);
}

class AirSourceHeatPump implements Equipment {
  private sortedHeatingRatings: NEEPccASHPRatingInfo[];
  private sortedCoolingRatings: NEEPccASHPRatingInfo[];

  constructor(ratings: NEEPccASHPRatingInfo[]) {
    // TODO(jlfwong): Find some way of de-duplicating the heating and cooling
    // bits of this logic.  Maybe some kind of generic "vapor compressor"
    // equipment type
    this.sortedHeatingRatings = ratings
      .filter((r) => r.mode === "heating")
      .sort((a, b) => absDeltaT(a) - absDeltaT(b));

    this.sortedHeatingRatings = ratings
      .filter((r) => r.mode === "cooling")
      .sort((a, b) => absDeltaT(a) - absDeltaT(b));
  }

  getInterpolatedPerformanceRating(
    responseNeeded: ThermalLoad,
    insideAirTemperature: Temperature,
    outsideAirTemperature: Temperature
  ): HeatPumpPerformanceRating {
    const deltaTemperatureFahrenheit =
      fahrenheit(outsideAirTemperature) - fahrenheit(insideAirTemperature);
    if (responseNeeded.type === "heating") {
      if (this.sortedHeatingRatings.length === 0) {
        throw new Error("Heat pump has no heating ratings");
      } else if (this.sortedHeatingRatings.length === 1) {
        throw new Error(
          "Heat pump has only a single heating rating. Aborting because this would lead to highly inaccurate results."
        );
      }

      let left: NEEPccASHPRatingInfo | null = null;
      let right: NEEPccASHPRatingInfo | null = null;

      for (let i = 1; i < this.sortedHeatingRatings.length; i++) {
        left = this.sortedHeatingRatings[i - 1];
        right = this.sortedHeatingRatings[i];
        if (
          absDeltaT(left) <= deltaTemperatureFahrenheit &&
          deltaTemperatureFahrenheit <= absDeltaT(right)
        ) {
          break;
        }
      }

      if (left && right) {
        const { minCapacity, maxCapacity } =
          interpolateVariableCapacityPerformanceRating(
            deltaTemperatureFahrenheit,
            absDeltaT(left),
            left,
            absDeltaT(right),
            right
          );

        const btuPerHourNeeded: number = btuPerHour(responseNeeded);

        // TODO(jlfwong): De-rating, clamping, sanity-adjustments

        if (btuPerHourNeeded > maxCapacity.btuPerHour) {
          // Can't supply more than max capacity
          return maxCapacity;
        } else if (btuPerHourNeeded < minCapacity.btuPerHour) {
          // Can supply less than min capacity by cycle
          return {
            btuPerHour: btuPerHourNeeded,
            coefficientOfPerformance: minCapacity.coefficientOfPerformance,
          };
        } else {
          // Thermal demand is within bounds of variable compressor operation,
          // so interpolate to find the coefficient of performance here.
          //
          // TODO(jlfwong): Is this actually a linear function?
          const coefficientOfPerformance = interpolate(
            btuPerHourNeeded,
            minCapacity.btuPerHour,
            minCapacity.coefficientOfPerformance,
            maxCapacity.btuPerHour,
            maxCapacity.coefficientOfPerformance
          );
          return {
            btuPerHour: btuPerHourNeeded,
            coefficientOfPerformance,
          };
        }

        return {
          coefficientOfPerformance,
          btuPerHour: Math.max(btuPerHourNeeded, maxCapacity.btuPerHour),
        };
      }
    } else if (responseNeeded.type === "cooling") {
      // TODO(jlfwong): Implement this
    } else {
      assertNever(responseNeeded.type);
    }
  }

  simulateThermalResponse(
    responseNeeded: ThermalLoad,
    insideAirTemperature: Temperature,
    outsideAirTemperature: Temperature
  ): EquipmentResponse {
    const deltaTemperatureCelcius =
      celcius(insideAirTemperature) - celcius(outsideAirTemperature);

    const rating = this.getInterpolatedPerformanceRating(
      responseNeeded,
      insideAirTemperature,
      outsideAirTemperature
    );

    // TODO(jlfwong): Convert to thermal response

    // Estimate the min & max capacity w/ associated coefficients of performance
    // by interpolating deltaTemperatureCelcius
    //
    // TODO(jlfwong): It
    // intuitively seems like there should be a better thing to use here than
    // deltaT

    // Once we've interpolated based on delta T, interpolate again to find the
    // appropriate coefficient of performance.
  }
}
class Furnace implements Equipment {}
class ElectricRadiator implements Equipment {}
class AirConditioner implements Equipment {}

class HeatpumpWithHeatstripBackup {}
class HeatpumpWithGasFurnaceBackup {}

interface Thermostat {
  getTargetInsideTemperature(
    localDateTime: Date,
    outsideAirTemperature: Temperature
  ): Temperature;
}

function* monthsBetween(
  localStartTime: Date,
  localEndTime: Date
): Iterable<[Date, Date]> {}

function* hoursBetween(
  localStartTime: Date,
  localEndTime: Date
): Iterable<[Date, Date]> {}

interface EquipmentSimulationResult {
  hourlyResults: {
    dateTime: Date;
    conditions: EnvironmentalConditions;
    load: ThermalLoad;
  }[];
  bills: BillSet[];
}

function sumThermalLoads(loads: ThermalLoad[]): ThermalLoad {}

interface Billing {
  recordElectricityUsageKwh(kWh: number, localTime: Date): void;
  recordNaturalGasUsageCcf(ccf: number, localTime: Date): void;
  recordFuelOilUsageGallons(gallons: number, localTime: Date): void;
  recordPropaneUsageGallons(gallons: Date, localTime: number): void;

  getBills(): Bill[];
}

function simulateEquipmentUsage(
  localStartTime: Date,
  localEndTime: Date,
  loadSources: ThermalLoadSource[],
  equipment: Equipment[],
  thermostat: Thermostat,
  weather: WeatherService,
  utilities: UtilitySet
): EquipmentSimulationResult {
  const bills: BillSet[] = [];
  for (let [monthStart, monthEnd] of monthsBetween(
    localStartTime,
    localEndTime
  )) {
    // TODO(jlfwong): For the purposes of simulation, this is probably fine,
    // though it it seems plausible for some billing structure to have different
    // utilities have different start/end dates. I don't know what that would
    // actually be important but... annoying in any case.
    let monthlyBills = utilities.createNewBillSet(localStartTime, localEndTime);

    for (let [hourStart, hourEnd] of hoursBetween(monthStart, monthEnd)) {
      // TODO(jlfwong): Need to figure out where to put the abstraction boundary
      // dealing with missing temperature data. Might be better to have it throw
      // errors
      // TODO(jlfwong): would be nice to make convenience functions for constructing this.
      // something like fahrenheit(60) or maybe... unit(60).fahrenheit() or v(60).fahrenheit()
      const outsideAirTemperature = weather.getTemperature(hourStart) || {
        value: 60,
        units: "fahrenheit",
      };

      // TODO(jlfwong): May want to differentiate between concept of target
      // inside temperature and actual. If we had energy shortfall, how plausible
      // would it be to estimate how much colder the air would be?
      const insideAirTemperature = thermostat.getTargetInsideTemperature(
        hourStart,
        outsideAirTemperature
      );

      const relativeHumidity = weather.getRelativeHumidity(hourStart) || {
        value: 50,
        units: "%",
      };

      const windSpeed = weather.getWindSpeed(hourStart) || {
        value: 0,
        units: "mph",
      };
      const cloudCover = weather.getCloudCover(hourStart) || {
        value: 0,
        units: "%",
      };
      const solarIrradiation = weather.getSolarIrradiation(hourStart) || {
        angle: { value: 0, units: "rad" },
        irradiation: { value: 0, units: "W/m^2" },
      };

      const environment: EnvironmentalConditions = {
        outsideAirTemperature,
        insideAirTemperature,
        relativeHumidity,
        windSpeed,
        cloudCover,
        solarIrradiation,
      };

      const totalLoad = sumThermalLoads(
        loadSources.map((s) => s.getThermalLoad(hourStart, environment))
      );
      for (let equip of equipment) {
        const result = equip.simulateThermalResponse(
          invertThermalLoad(totalLoad),
          insideAirTemperature,
          outsideAirTemperature
        );
        for (let fuel of result.fuelUsagePerHour) {
          switch (fuel.type) {
            case "electricity": {
              // TODO(jlfwong): Why is this type-cast necessary? It should be
              // inferred automatically from flow control analysis.
              monthlyBills.electricity.addUsage(
                hourStart,
                fuel as FuelAmount<"electricity">
              );
              break;
            }

            case "natural gas": {
              monthlyBills.naturalGas.addUsage(
                hourStart,
                fuel as FuelAmount<"natural gas">
              );
              break;
            }

            default: {
              // TODO(jlfwong): Deal with other fuels
              throw new Error("Not implemented yet");
            }
          }
        }
      }
    }
    bills.push(monthlyBills);
  }
  return bills;
}
