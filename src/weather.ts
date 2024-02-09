import { DateTime } from "luxon";
import { WeatherSnapshot } from "./types";

export interface WeatherSource {
  getWeather(localTime: DateTime): WeatherSnapshot;
}

interface JSONWeatherEntry extends WeatherSnapshot {
  datetime: string;
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
    return datetime.toUTC().toFormat("yyyy-LL-dd HH");
  }

  getWeather(localTime: DateTime<boolean>): WeatherSnapshot {
    const hourKey = this.hourKey(localTime);
    if (!(hourKey in this.entryByHour)) {
      throw new Error(`No entry for ${hourKey}`);
    }
    return this.entryByHour[hourKey];
  }
}
