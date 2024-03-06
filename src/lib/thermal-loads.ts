import { DateTime } from "luxon";
import { BuildingGeometry } from "./building-geometry";
import { interpolateClamped } from "./math";
import { WeatherSnapshot } from "./types";

export interface ThermalLoadSource {
  readonly name: string;

  // Positive values mean warming the contents of the building, negative values
  // mean cooling.
  getBtusPerHour(
    localDateTime: DateTime,
    insideAirTempF: number,
    weather: WeatherSnapshot
  ): number;
}

// Load caused by occupants' bodies emitting heat
export class OccupantsLoadSource implements ThermalLoadSource {
  readonly name = "occupants";

  constructor(private numOccupants: number) {}

  getBtusPerHour(
    localDateTime: DateTime,
    insideAirTempF: number,
    weather: WeatherSnapshot
  ): number {
    const hour = localDateTime.hour;

    if (9 < hour && hour < 14) {
      // Assume people are out to work during the day, weighted by how likely
      // occupants are to be out of their homes
      //
      // TODO(jlfwong): This choice of hours seems weird? This works
      // out to 10:00 - 2:00
      return 0;
    }

    const isAwake = 6 < hour && hour < 22;

    // TODO(jlfwong): Ask Calvin & Baker where these numbers come from
    const perOccupantSensible = 230;

    // Latent here is changes in energy due to humidity
    const perOccupantLatent = 200;

    // Reduced metabolish & breathing while asleep
    const sleepingDeflator = isAwake ? 1.0 : 0.85;

    return (
      this.numOccupants *
      (perOccupantSensible + perOccupantLatent) *
      sleepingDeflator
    );
  }
}

// Load caused by heat energy equilibriating via conduction and convection
// through the building envelope
export class ConductionConvectionLoadSource implements ThermalLoadSource {
  readonly name = "conduction-convection";

  constructor(
    private options: {
      geometry: BuildingGeometry;
      envelopeModifier: number; // lower value means tighter
    }
  ) {}

  getBtusPerHour(
    localDateTime: DateTime,
    insideAirTempF: number,
    weather: WeatherSnapshot
  ): number {
    const deltaTempF = weather.outsideAirTempF - insideAirTempF;

    const {
      exteriorWallsSqFt: wallsSqFt,
      windowsSqFt,
      ceilingSqFt,
      exteriorFloorSqFt: floorSqFt,
    } = this.options.geometry;

    // U values BTUs/(hr x ft^2 x °F)
    // TODO(jlfwong): Source these values
    const wallUFactor = 0.086;
    const windowUFactor = 0.751;

    const ceilingUFactor = 0.076;

    // TODO(jlfwong): Thinking about floor losses like this is confusing to me
    // because the ground temperature is totally different than the outside air
    // temperature.
    const floorUFactor = 0.101;

    // TODO(jlfwong): Small optimization by factoring out the envelope multiplier & deltaTempF
    const wallLoadbtusPerHour =
      wallUFactor * wallsSqFt * deltaTempF * this.options.envelopeModifier;
    const ceilingLoadbtusPerHour =
      ceilingUFactor * ceilingSqFt * deltaTempF * this.options.envelopeModifier;
    const floorLoadbtusPerHour =
      floorUFactor * floorSqFt * deltaTempF * this.options.envelopeModifier;

    // TODO(jlfwong): Ask Baker about window cooling deflator of 0.90
    const windowCoolingDeflating =
      weather.outsideAirTempF > insideAirTempF ? 0.9 : 1.0;

    const windowLoadbtusPerHour =
      windowUFactor *
      windowsSqFt *
      windowCoolingDeflating *
      deltaTempF *
      this.options.envelopeModifier;

    const totalBtusPerHour =
      wallLoadbtusPerHour +
      windowLoadbtusPerHour +
      ceilingLoadbtusPerHour +
      floorLoadbtusPerHour;

    return totalBtusPerHour;
  }
}

// Load caused by air moving in and out of the building due to imperfect seal
export class InfiltrationLoadSource implements ThermalLoadSource {
  readonly name = "infiltration";

  constructor(
    private options: {
      geometry: BuildingGeometry;
      envelopeModifier: number; // lower value means tighter
    }
  ) {}

  getBtusPerHour(
    localDateTime: DateTime,
    insideAirTempF: number,
    weather: WeatherSnapshot
  ): number {
    // BTUs/(hr x ft^2 x °F)

    let uFactor: number;
    if (weather.windSpeedMph <= 5) {
      // TODO(jlfwong): Find the right section to cite for these figures
      //
      // Also it seems nuts that this is a step-function change rather than
      // being interpolated
      uFactor = 47 / 894;
    } else {
      uFactor = 87 / 894;
    }

    let infiltrationMultiplier: number;

    // Interpolate within this table to find an appropriate infiltration modifier
    //
    // seal type | envelope modifier | infiltration modifier
    // ----------+-------------------+----------------------------
    // tight     |              0.30 | 1.0
    // average   |              0.60 | 2.7 (or 2.8 when it's cold)
    // loose     |              1.05 | 5.6 (or 5.8 when it's cold)

    const isColderOutside = weather.outsideAirTempF < insideAirTempF;

    if (this.options.envelopeModifier <= 0.6) {
      infiltrationMultiplier = interpolateClamped(
        0.3,
        1.0,
        0.6,
        isColderOutside ? 2.8 : 2.7,
        this.options.envelopeModifier
      );
    } else {
      infiltrationMultiplier = interpolateClamped(
        0.6,
        isColderOutside ? 2.8 : 2.7,
        1.05,
        isColderOutside ? 5.8 : 5.6,
        this.options.envelopeModifier
      );
    }

    let deltaT = weather.outsideAirTempF - insideAirTempF;

    // Will be negative if inside air is warmer than outside air.
    let infiltrationGainbtusPerHour =
      uFactor *
      this.options.geometry.windowsSqFt *
      deltaT *
      infiltrationMultiplier;

    if (weather.relativeHumidityPercent > 50) {
      // Regardless of whether we're heating or warming, the effects of added humidity contribute gain,
      // since condensation is exothermic
      //
      // TODO(jlfwong): This formula not being proportional to the actual value
      // of relative humidity doesn't make any sense to me.
      infiltrationGainbtusPerHour +=
        (808 / 894) *
        this.options.geometry.windowsSqFt *
        infiltrationMultiplier;
    }

    return infiltrationGainbtusPerHour;
  }
}

// Load from sunlight hitting the house
export class SolarGainLoadSource implements ThermalLoadSource {
  name = "solar-gain";

  constructor(
    private options: {
      geometry: BuildingGeometry;

      // TODO(jlfwong): Should this also have the envelope modifier for the wall
      // & ceiling gain? Presumably the walls & roof heating up due to sun
      // exposure has thermal transfer modulated by insulation.
      solarModifier: number;
    }
  ) {}

  getBtusPerHour(
    localDateTime: DateTime,
    insideAirTempF: number,
    conditions: WeatherSnapshot
  ): number {
    const { solarIrradiance } = conditions;

    // Solar irradiance
    //
    // For pre-computation, see
    // See: https://github.com/kelvin-hp/analysis/blob/ee5ae72bf07b3588ce589ef57b277da0cff50e4d/costs/weather.ipynb#L20

    if (solarIrradiance.altitudeDegrees < 0) {
      return 0;
    }

    const strengthUnderClouds = 0.15;
    const cloudCoverMultiplier =
      1 -
      conditions.cloudCoverPercent / 100 +
      (conditions.cloudCoverPercent / 100) * strengthUnderClouds;

    const altitudeRad = solarIrradiance.altitudeDegrees * (Math.PI / 180.0);
    const horizontalIrradiance =
      solarIrradiance.wattsPerSquareMeter * Math.cos(altitudeRad);
    const verticalIrradiance =
      solarIrradiance.wattsPerSquareMeter * Math.sin(altitudeRad);

    // The per-sqft values below are based on the assumption of "full strength"
    // solar radiation. These numbers (in watts/m^3) are used are used to
    // estimate what proportion of "full strength" to use.
    //
    // TODO(jlfwong): This seems like a huge hack, and there must be a more
    // intuitive physically-based strategy for this that still scales
    // reasonably.
    const horizontalIrradianceMultiplier =
      (horizontalIrradiance / 883) * cloudCoverMultiplier;
    const veriticalIrradianceMultiplier =
      (verticalIrradiance / 535) * cloudCoverMultiplier;

    // Empirically determined btus/(hr x ft^2)
    // These are already accommodate for the fact that that walls & windows are
    // only exposed for part of the day as the sun moves around
    const ceilingSolarGainPerSqFt = 1.4;
    const windowSolarGainPerSqFt = 3.5;
    const wallsSolarGainPerSqft = 0.5;

    const {
      windowsSqFt,
      exteriorWallsSqFt: wallsSqFt,
      ceilingSqFt,
    } = this.options.geometry;

    const ceilingGain =
      ceilingSolarGainPerSqFt *
      ceilingSqFt *
      this.options.solarModifier *
      veriticalIrradianceMultiplier;

    const windowGain =
      windowSolarGainPerSqFt *
      windowsSqFt *
      this.options.solarModifier *
      horizontalIrradianceMultiplier;

    const wallGain =
      wallsSolarGainPerSqft *
      wallsSqFt *
      this.options.solarModifier *
      horizontalIrradianceMultiplier;

    return ceilingGain + windowGain + wallGain;
  }
}
