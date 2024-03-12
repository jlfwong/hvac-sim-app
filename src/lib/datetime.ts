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

// TODO(jlfwong): if this is fast enough, then
import moment from "moment-timezone";

export class DateTime {
  private momentObj: moment.Moment;

  constructor(utcTimestampMs: number, timeZoneName = "UTC") {
    this.momentObj = moment.utc(utcTimestampMs).tz(timeZoneName);
  }

  static utcFromISO(isoString: string): DateTime {
    return new DateTime(moment.utc(isoString).valueOf());
  }

  static fromObject({
    timeZoneName = "UTC",
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0,
  }: {
    timeZoneName?: string;
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
    second?: number;
    millisecond?: number;
  }): DateTime {
    const utcMoment = moment.utc({
      year,
      month: month - 1,
      day,
      hour,
      minute,
      second,
      millisecond,
    });
    return new DateTime(utcMoment.valueOf(), timeZoneName);
  }

  format(formatString: string): string {
    return this.momentObj.format(formatString);
  }

  equals(other: DateTime): boolean {
    return this.momentObj.isSame(other.momentObj);
  }

  valueOf(): number {
    return this.momentObj.valueOf();
  }

  toMillis(): number {
    return this.valueOf();
  }

  toJSDate(): Date {
    return this.momentObj.toDate();
  }

  toUTC(): DateTime {
    return new DateTime(this.valueOf(), "UTC");
  }

  offsetMs(): number {
    return this.momentObj.utcOffset() * 60 * 1000;
  }

  get year(): number {
    return this.momentObj.year();
  }

  get month(): number {
    return this.momentObj.month() + 1; // Moment months are 0-indexed
  }

  get day(): number {
    return this.momentObj.date();
  }

  get hour(): number {
    return this.momentObj.hour();
  }

  get minute(): number {
    return this.momentObj.minute();
  }

  get second(): number {
    return this.momentObj.second();
  }

  get millisecond(): number {
    return this.momentObj.millisecond();
  }

  plusMinutes(minutes: number): DateTime {
    return new DateTime(
      this.momentObj.clone().add(minutes, "minutes").valueOf(),
      this.momentObj.tz()
    );
  }

  plusHours(hours: number): DateTime {
    return new DateTime(
      this.momentObj.clone().add(hours, "hours").valueOf(),
      this.momentObj.tz()
    );
  }

  plusMonths(months: number): DateTime {
    return new DateTime(
      this.momentObj.clone().add(months, "months").valueOf(),
      this.momentObj.tz()
    );
  }

  startOfHour(): DateTime {
    return new DateTime(
      this.momentObj.clone().startOf("hour").valueOf(),
      this.momentObj.tz()
    );
  }

  endOfDay(): DateTime {
    return new DateTime(
      this.momentObj.clone().endOf("day").valueOf(),
      this.momentObj.tz()
    );
  }

  startOfMonth(): DateTime {
    return new DateTime(
      this.momentObj.clone().startOf("month").valueOf(),
      this.momentObj.tz()
    );
  }

  endOfMonth(): DateTime {
    return new DateTime(
      this.momentObj.clone().endOf("month").valueOf(),
      this.momentObj.tz()
    );
  }
}
