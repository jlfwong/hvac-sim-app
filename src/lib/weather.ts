import { DateTime, Duration } from "luxon";
import { WeatherSnapshot } from "./types";
import { interpolate } from "./math";

export interface WeatherSource {
  getWeather(localTime: DateTime): WeatherSnapshot;
}

export interface JSONWeatherEntry extends WeatherSnapshot {
  datetime: string;
}

// We create this object once to avoid the construction cost
// on every call to .plus below
const oneHour = Duration.fromObject({ hours: 1 });

export class BinnedTemperatures {
  private hoursByTempF = new Map<number, number>();
  private sortedBins: { outsideAirTempF: number; hourCount: number }[] = [];
  private sortedTempF: number[] = [];

  constructor(entries: JSONWeatherEntry[]) {
    for (let entry of entries) {
      this.sortedTempF.push(entry.outsideAirTempF);
      this.hoursByTempF.set(
        Math.round(entry.outsideAirTempF),
        (this.hoursByTempF.get(entry.outsideAirTempF) || 0) + 1
      );
    }
    this.sortedTempF.sort();

    const binEntries = Array.from(this.hoursByTempF.entries());
    binEntries.sort((a, b) => a[0] - b[0]);
    for (let [outsideAirTempF, hourCount] of binEntries) {
      this.sortedBins.push({ outsideAirTempF, hourCount });
    }
  }

  getTempAtPercentile(percentile: number) {
    const idx = Math.floor((percentile / 100) * (this.sortedTempF.length - 1));
    return this.sortedTempF[idx];
  }

  forEachBin(
    cb: (bin: { outsideAirTempF: number; hourCount: number }) => void
  ) {
    this.sortedBins.forEach(cb);
  }
}

export class JSONBackedHourlyWeatherSource implements WeatherSource {
  private entryByHour: { [key: string]: JSONWeatherEntry } = {};

  constructor(entries: JSONWeatherEntry[]) {
    for (let entry of entries) {
      const dt = DateTime.fromISO(entry.datetime);
      this.entryByHour[this.hourKey(dt)] = entry;
    }
  }

  private hourKey(datetime: DateTime): string {
    // Make sure we convert to UTC first to get the hour of the day!
    const dt = datetime.toUTC();

    // We could use luxon's DateTime.toFormat here, but this is much much faster
    return `${dt.year}-${dt.month}-${dt.day} ${dt.hour}:00`;
  }

  private getWeatherForHour(localTime: DateTime): WeatherSnapshot {
    const hourKey = this.hourKey(localTime);
    if (!(hourKey in this.entryByHour)) {
      throw new Error(`No entry for ${hourKey}`);
    }
    return this.entryByHour[hourKey];
  }

  getWeather(localTime: DateTime): WeatherSnapshot {
    // We convert to UTC immediately because the startOf and plus functions are
    // more efficient when operating on UTC because they don't have to
    // complicated timezone reconciliation at each step.
    const utc = localTime.toUTC();
    const startOfHour = utc.startOf("hour");

    // We use hour plus one rather than .endOf("hour") here because
    // the end of the hour gives :59:59.99. If you ask for the hourKey
    // for that time, you get the same key as the startOfHour.
    const endOfHour = startOfHour.plus(oneHour);

    const startWeather = this.getWeatherForHour(startOfHour);
    if (localTime.equals(startOfHour)) {
      // Small optimization
      return startWeather;
    }
    const endWeather = this.getWeatherForHour(endOfHour);

    // For times in-between hours, we'll interpolate.  Many of these functions
    // are, of course, not linear, but we'll assume they are as a rough
    // estimate.
    const startMillis = startOfHour.toMillis();
    const endMillis = endOfHour.toMillis();
    const targetMillis = utc.toMillis();

    const outsideAirTempF = interpolate(
      startMillis,
      startWeather.outsideAirTempF,
      endMillis,
      endWeather.outsideAirTempF,
      targetMillis
    );

    const relativeHumidityPercent = interpolate(
      startMillis,
      startWeather.relativeHumidityPercent,
      endMillis,
      endWeather.relativeHumidityPercent,
      targetMillis
    );

    // This one is a little dicey without directional information.  Since we're
    // just interpolating within an hour though, it should be fine
    const windSpeedMph = interpolate(
      startMillis,
      startWeather.windSpeedMph,
      endMillis,
      endWeather.windSpeedMph,
      targetMillis
    );

    const cloudCoverPercent = interpolate(
      startMillis,
      startWeather.cloudCoverPercent,
      endMillis,
      endWeather.cloudCoverPercent,
      targetMillis
    );

    const solarIrradiance = {
      altitudeDegrees: interpolate(
        startMillis,
        startWeather.solarIrradiance.altitudeDegrees,
        endMillis,
        endWeather.solarIrradiance.altitudeDegrees,
        targetMillis
      ),
      wattsPerSquareMeter: interpolate(
        startMillis,
        startWeather.solarIrradiance.wattsPerSquareMeter,
        endMillis,
        endWeather.solarIrradiance.wattsPerSquareMeter,
        targetMillis
      ),
    };

    if (solarIrradiance.altitudeDegrees < 0) {
      solarIrradiance.wattsPerSquareMeter = 0;
    }

    return {
      outsideAirTempF,
      relativeHumidityPercent,
      windSpeedMph,
      cloudCoverPercent,
      solarIrradiance,
    };
  }
}
