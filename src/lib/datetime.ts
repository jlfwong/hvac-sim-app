// A simple, restricted timezone aware DateTime implementation.
//
// The luxon library is wonderfully ergonomic, but ended up being the main
// performance bottleneck when running simulations. Here, we'll use a much
// simpler, more restricted implementation heavily focused on performance.
//
// The implementation is immutable, and stores only a UTC millisecond
// timestamp and the name of the IANA timezone.
//
// Like luxon's implementation, values returned by getters are 1-based,
// unlike JavaScript's annoying 0-based. This means e.g. January is 1, December
// is 12, etc.
//
// TODO(jlfwong): Write tests for this

// floorMod, isLeapYear, and daysInMonth are diretly from luxon's source:
// https://github.com/moment/luxon/blob/master/src/impl/util.js#L178

// x % n but takes the sign of n instead of x
export function floorMod(x: number, n: number): number {
  return x - n * Math.floor(x / n);
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInMonth(year: number, month: number): number {
  const modMonth = floorMod(month - 1, 12) + 1,
    modYear = year + (month - modMonth) / 12;

  if (modMonth === 2) {
    return isLeapYear(modYear) ? 29 : 28;
  } else {
    return [31, null, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][modMonth - 1]!;
  }
}

export class DateTime {
  private dateObj: Date;

  constructor(readonly utcTimestampMs: number, readonly timeZoneName = "UTC") {
    this.dateObj = new Date(utcTimestampMs);
  }

  static utcFromISO(isoString: string): DateTime {
    return new DateTime(+new Date(isoString));
  }

  static fromObject({
    timeZoneName,
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
  }: {
    timeZoneName: string;
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
    second?: number;
    millisecond?: number;
  }): DateTime {
    // Finding the UTC timestamp which will result in a given timezone
    // displaying a given date & time is tricky!

    // First, we'll construct the given date assuming everything is UTC
    const firstGuessTimestamp = Date.UTC(
      year,
      month - 1,
      day,
      hour || 0,
      minute || 0,
      second || 0,
      millisecond || 0
    );

    // Next, we construct a new datetime representing the same
    // moment in time, and construct another datetime.
    const offsetMs = new DateTime(firstGuessTimestamp, timeZoneName).offsetMs();

    // Now we construct a new DateTime applying the time zone offset backwards.
    //
    // Here's how that works:
    //
    // Goal: 2024-01-01T14:00:00.000 in America/Toronto
    //
    // We start with:
    //
    //   2024-01-01T14:00:00.000+00:00
    //
    // Next, we format this date for display in America/Toronto
    //
    //   2024-01-01T09:00:00.000-05:00
    //
    // Now we apply the offset shown backwards: we add 5 hours, and get:
    //
    //   2024-01-01T14:00:00.000-05:00
    const result = new DateTime(firstGuessTimestamp - offsetMs, timeZoneName);
    const resultOffsetMs = result.offsetMs();

    // This should work in most cases, but there's an edge case: if the offset
    // update causes the timezone to cross a daylight savings boundary, it'll be
    // off by one hour. To address this, we recalculate the tz offset.
    if (resultOffsetMs === offsetMs) {
      return result;
    }

    // There are further edge cases, which we'll ignore.
    // See https://github.com/moment/luxon/blob/f257940093dca8efa976e142e0f33ed3620425ed/src/datetime.js#L99-L124
    return new DateTime(firstGuessTimestamp - result.offsetMs(), timeZoneName);
  }

  format(formatOptions: Intl.DateTimeFormatOptions): string {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: this.timeZoneName,
      hour12: false,
      hourCycle: "h23",
      ...formatOptions,
    });
    return formatter.format(this.dateObj);
  }

  private cache: { [fieldName: string]: number } = {};
  private get(
    fieldName: "year" | "month" | "day" | "hour" | "minute" | "second"
  ): number {
    if (!(fieldName in this.cache)) {
      this.cache[fieldName] = parseInt(
        this.format({ [fieldName]: "numeric" }),
        10
      );
    }
    return this.cache[fieldName];
  }

  equals(other: DateTime): boolean {
    // Timezone intentionally omitted here
    return this.utcTimestampMs === other.utcTimestampMs;
  }

  valueOf(): number {
    return this.utcTimestampMs;
  }

  toMillis(): number {
    return this.utcTimestampMs;
  }

  toJSDate(): Date {
    // We intentionally make a copy here because
    // date objects are mutable
    return new Date(this.dateObj);
  }

  toUTC(): DateTime {
    return new DateTime(this.utcTimestampMs, "UTC");
  }

  offsetMs(): number {
    // Will be something like "3/8/2024, GMT-08:00" because Intl.DateTimeFormat
    // will set year, month, and day to "numeric" if all other date/time components
    // are undefined.
    // For UTC, will be "3/8/2024, GMT"
    const offsetString = this.format({ timeZoneName: "longOffset" });
    const match = /([-+])(\d+):(\d+)/.exec(offsetString);
    if (!match) {
      return 0;
    }
    const sign = match[1];
    const hours = parseInt(match[2], 10);
    const minutes = parseInt(match[3], 10);
    return (sign === "-" ? -1 : 1) * ((hours * 60 + minutes) * 60) * 1000;
  }

  get year(): number {
    return this.get("year");
  }

  get month(): number {
    return this.get("month");
  }

  get day(): number {
    return this.get("day");
  }

  get hour(): number {
    return this.get("hour");
  }

  get minute(): number {
    return this.get("minute");
  }

  get second(): number {
    return this.get("second");
  }

  get millisecond(): number {
    // The Intl.DateTimeFormat API doesn't offer any way of
    // accessing milliseconds. I'm not aware of any timezones
    // that present millisecond timezone shifts though.
    return this.utcTimestampMs % 1000;
  }

  plusMinutes(minutes: number): DateTime {
    return new DateTime(
      this.utcTimestampMs + minutes * 60 * 1000,
      this.timeZoneName
    );
  }

  plusHours(hours: number): DateTime {
    return new DateTime(
      this.utcTimestampMs + hours * 60 * 60 * 1000,
      this.timeZoneName
    );
  }

  plusMonths(months: number): DateTime {
    const monthUnclamped = this.month + months;

    const deltaYears = Math.floor(monthUnclamped / 12);
    const year = this.year + deltaYears;
    const month = floorMod(this.month + monthUnclamped, 12);

    return DateTime.fromObject({
      timeZoneName: this.timeZoneName,

      year,
      month,
      day: Math.min(this.day, daysInMonth(year, month)),

      hour: this.hour,
      minute: this.minute,
      second: this.second,
      millisecond: this.millisecond,
    });
  }

  startOfHour(): DateTime {
    const msToSubtract =
      (this.minute * 60 + this.second) * 1000 + this.millisecond;
    return new DateTime(this.utcTimestampMs - msToSubtract, this.timeZoneName);
  }

  endOfDay(): DateTime {
    return DateTime.fromObject({
      timeZoneName: this.timeZoneName,
      year: this.year,
      month: this.month,
      day: this.day,
      hour: 23, // We'll ignore DST, but man, what a pain
      minute: 59,
      second: 59,
      millisecond: 999,
    });
  }

  startOfMonth(): DateTime {
    return DateTime.fromObject({
      timeZoneName: this.timeZoneName,
      year: this.year,
      month: this.month,
      day: 1,
      hour: 0,
      minute: 0,
      second: 0,
    });
  }

  endOfMonth(): DateTime {
    return DateTime.fromObject({
      timeZoneName: this.timeZoneName,
      year: this.year,
      month: this.month,
      day: daysInMonth(this.year, this.month),
      hour: 0,
      minute: 0,
      second: 0,
    });
  }
}
