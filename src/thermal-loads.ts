import { interpolateClamped } from "./math";
import { EnvironmentalConditions, ThermalLoad } from "./types";

interface ThermalLoadSource {
  getThermalLoad(
    localDateTime: Date,
    conditions: EnvironmentalConditions
  ): ThermalLoad;
}

// Load caused by occupants' bodies emitting heat
export class OccupantsLoadSource implements ThermalLoadSource {
  constructor(private numOccupants: number) {}

  getbtuPerHour(localDateTime: Date) {
    const hour = localDateTime.getHours();

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

  getThermalLoad(
    localDateTime: Date,
    conditions: EnvironmentalConditions
  ): ThermalLoad {
    return { type: "heating", btuPerHour: this.getbtuPerHour(localDateTime) };
  }
}

interface HomeGeometryParams {
  floorSpaceSqFt: number;
  ceilingHeightFt: number;
  numStories: number;
  lengthToWidthRatio: number;
}

export class HomeGeometry {
  windowsSqFt: number;
  wallsSqFt: number;
  ceilingSqFt: number;
  floorSqFt: number;

  constructor(private geometry: HomeGeometryParams) {
    const { floorSpaceSqFt, ceilingHeightFt, numStories, lengthToWidthRatio } =
      geometry;

    const footPrintSquareFeet = floorSpaceSqFt / numStories;
    const footPrintLengthFeet = Math.sqrt(
      footPrintSquareFeet / lengthToWidthRatio
    );
    const footPrintWidthFeet = footPrintSquareFeet / footPrintLengthFeet;
    const perimeterFeet = footPrintLengthFeet * 2 + footPrintWidthFeet * 2;

    const wallsAndWindowsSquareFeet =
      perimeterFeet * ceilingHeightFt * numStories;

    // From Manual J
    // TODO(jlfwong): Find the source for this
    const percentageWallsThatAreWindows = 20;

    const windowsSquareFeet =
      (percentageWallsThatAreWindows / 100.0) * wallsAndWindowsSquareFeet;
    const wallsSquareFeeet = wallsAndWindowsSquareFeet - windowsSquareFeet;

    this.wallsSqFt = wallsSquareFeeet;
    this.windowsSqFt = windowsSquareFeet;
    this.ceilingSqFt = footPrintSquareFeet;
    this.floorSqFt = footPrintSquareFeet;
  }
}

// Load caused by heat energy equilibriating via conduction and convection
// through the building envelope
export class ConductionConvectionLoadSource implements ThermalLoadSource {
  constructor(
    private geometry: HomeGeometry,
    private envelopeMultiplier: number // lower value means tighter
  ) {}

  getThermalLoad(
    localDateTime: Date,
    conditions: EnvironmentalConditions
  ): ThermalLoad {
    const deltaTempF = Math.abs(
      conditions.outsideAirTempF - conditions.insideAirTempF
    );

    const { wallsSqFt, windowsSqFt, ceilingSqFt, floorSqFt } = this.geometry;

    // U values BTUs/(hr x ft^2 x °F)
    // TODO(jlfwong): Source these values
    const wallUFactor = 0.086;
    const windowUFactor = 0.751;
    const ceilingUFactor = 0.076;
    const floorUFactor = 0.101;

    // TODO(jlfwong): Small optimization by factoring out the evenlope multiplier & deltaTempF
    const wallLoadbtuPerHour =
      wallUFactor * wallsSqFt * deltaTempF * this.envelopeMultiplier;
    const ceilingLoadbtuPerHour =
      ceilingUFactor * ceilingSqFt * deltaTempF * this.envelopeMultiplier;
    const floorLoadbtuPerHour =
      floorUFactor * floorSqFt * deltaTempF * this.envelopeMultiplier;

    // TODO(jlfwong): Ask Baker about window cooling deflator of 0.90
    const windowCoolingDeflating =
      conditions.outsideAirTempF > conditions.insideAirTempF ? 0.9 : 1.0;

    const windowLoadbtuPerHour =
      windowUFactor *
      windowsSqFt *
      windowCoolingDeflating *
      deltaTempF *
      this.envelopeMultiplier;

    const totalbtuPerHour =
      wallLoadbtuPerHour +
      windowLoadbtuPerHour +
      ceilingLoadbtuPerHour +
      floorLoadbtuPerHour;

    return {
      type:
        conditions.outsideAirTempF > conditions.insideAirTempF
          ? "heating"
          : "cooling",
      btuPerHour: Math.abs(totalbtuPerHour),
    };
  }
}

// Load caused by air moving in and out of the building due to imperfect seal
export class InfiltrationLoadSource implements ThermalLoadSource {
  constructor(
    private geometry: HomeGeometry,
    private envelopeModifier: number // lower value means tighter
  ) {}

  getThermalLoad(
    localDateTime: Date,
    conditions: EnvironmentalConditions
  ): ThermalLoad {
    // BTUs/(hr x ft^2 x °F)

    let uFactor: number;
    if (conditions.windSpeedMph <= 5) {
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

    const isColderOutside =
      conditions.outsideAirTempF < conditions.insideAirTempF;

    if (this.envelopeModifier <= 0.6) {
      infiltrationMultiplier = interpolateClamped(
        0.3,
        1.0,
        0.6,
        isColderOutside ? 2.8 : 2.7,
        this.envelopeModifier
      );
    } else {
      infiltrationMultiplier = interpolateClamped(
        0.6,
        isColderOutside ? 2.8 : 2.7,
        1.05,
        isColderOutside ? 5.8 : 5.6,
        this.envelopeModifier
      );
    }

    let deltaT = conditions.outsideAirTempF - conditions.insideAirTempF;

    // Will be negative if inside air is warmer than outside air.
    let infiltrationGainbtuPerHour =
      uFactor * this.geometry.windowsSqFt * deltaT * infiltrationMultiplier;

    if (conditions.relativeHumidityPercent > 50) {
      // Regardless of whether we're heating or warming, the effects of added humidity contribute gain,
      // since condensation is exothermic
      //
      // TODO(jlfwong): This formula not being proportional to the actual value
      // of relative humidity doesn't make any sense to me.
      infiltrationGainbtuPerHour +=
        (808 / 894) * this.geometry.windowsSqFt * infiltrationMultiplier;
    }

    return {
      type: infiltrationGainbtuPerHour > 0 ? "heating" : "cooling",
      btuPerHour: Math.abs(infiltrationGainbtuPerHour),
    };
  }
}

// Load from sunlight hitting the house
export class SolarGainLoadSource implements ThermalLoadSource {
  constructor(private geometry: HomeGeometry, private solarModifier: number) {}

  getThermalLoad(
    localDateTime: Date,
    conditions: EnvironmentalConditions
  ): ThermalLoad {
    const { solarIrradiance } = conditions;

    // Solar irradiance
    //
    // For pre-computation, see
    // See: https://github.com/kelvin-hp/analysis/blob/ee5ae72bf07b3588ce589ef57b277da0cff50e4d/costs/weather.ipynb#L20

    if (solarIrradiance.altitudeDegrees < 0) {
      return { type: "heating", btuPerHour: 0 };
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

    const { windowsSqFt, wallsSqFt, ceilingSqFt } = this.geometry;

    const ceilingGain =
      ceilingSolarGainPerSqFt *
      ceilingSqFt *
      this.solarModifier *
      veriticalIrradianceMultiplier;

    const windowGain =
      windowSolarGainPerSqFt *
      windowsSqFt *
      this.solarModifier *
      horizontalIrradianceMultiplier;
    const wallGain =
      wallsSolarGainPerSqft *
      wallsSqFt *
      this.solarModifier *
      horizontalIrradianceMultiplier;

    // Solar gain is always positive
    return {
      type: "heating",
      btuPerHour: ceilingGain + windowGain + wallGain,
    };
  }
}
