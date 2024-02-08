import { DateTime } from "luxon";

interface WeatherEntry {
  outsideAirTempF: number;
  relativeHumidityPercent: number;
  windSpeedMph: number;
  cloudCoverPercent: number;
  solarIrradiance: {
    altitudeDegrees: number;
    wattsPerSquareMeter: number;
  };
}

export interface WeatherSource {
  getWeather(localTime: DateTime): WeatherEntry;
}

interface JSONWeatherEntry extends WeatherEntry {
  datetime: string;
}

export class JSONBackedHourlyWeatherSource implements WeatherSource {
  private entryByHour: { [key: string]: JSONWeatherEntry } = {};

  constructor(entries: JSONWeatherEntry[]) {
    for (let entry of entries) {
      const dt = DateTime.fromISO(entry.datetime, { setZone: true });
      this.entryByHour[this.hourKey(dt)] = entry;
    }
    const dt = DateTime.fromISO(entries[0].datetime);
    console.log(this.hourKey(dt), dt.toISO());
  }

  private hourKey(datetime: DateTime): string {
    return datetime.toUTC().toFormat("yyyy-LL-dd HH");
  }

  getWeather(localTime: DateTime<boolean>): WeatherEntry {
    const hourKey = this.hourKey(localTime);
    if (!(hourKey in this.entryByHour)) {
      throw new Error(`No entry for ${hourKey}`);
    }
    return this.entryByHour[hourKey];
  }
}
