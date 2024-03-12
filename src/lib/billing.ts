import { DateTime } from "luxon";

type FuelType = "electricity" | "natural gas" | "fuel oil" | "propane";

type BillingLineItem = { description: string; amount: number };

function getTotalFromItemized(items: BillingLineItem[]): number {
  return items.reduce((acc, i) => acc + i.amount, 0);
}

export interface EnergyBill {
  getBillingPeriodStart(): DateTime;
  getBillingPeriodEnd(): DateTime;
  getTotalCost(): number;
  getFuelType(): FuelType;
  getFuelUsage(): number;
  getFuelUnit(): string;
  getLineItems(): BillingLineItem[];
}

export interface UtilityPlan {
  getBills(from: DateTime, to: DateTime): EnergyBill[];
}

export interface ElectricalUtilityPlan extends UtilityPlan {
  recordElectricityUsageKwh(kWh: number, localTime: DateTime): void;
}

export interface NaturalGasUtilityPlan extends UtilityPlan {
  recordNaturalGasUsageCcf(ccf: number, localTime: DateTime): void;
}

export interface FuelOilUtilityPlan extends UtilityPlan {
  recordFuelOilUsageGallons(gallons: number, localTime: DateTime): void;
}

export class SimpleFuelBill implements EnergyBill {
  constructor(
    private readonly options: {
      billingPeriodStart: DateTime;
      billingPeriodEnd: DateTime;
      fuelUsage: number;
      fuelUnit: string;
      fuelType: FuelType;
      fixedCost: number;
      costPerFuelUnit: number;
    }
  ) {}

  getBillingPeriodStart(): DateTime {
    return this.options.billingPeriodStart;
  }
  getBillingPeriodEnd(): DateTime {
    return this.options.billingPeriodEnd;
  }

  getLineItems(): BillingLineItem[] {
    // TODO(jlfwong): Hmm, perhaps there should be a currency formatter here and
    // bills should be currency aware
    return [
      { description: "Fixed charges", amount: this.options.fixedCost },
      {
        description: `${this.options.fuelUsage.toFixed(2)} ${
          this.options.fuelUnit
        } (at ${this.options.costPerFuelUnit}/${this.options.fuelUnit})`,
        amount: this.options.fuelUsage * this.options.costPerFuelUnit,
      },
    ];
  }

  getTotalCost(): number {
    return getTotalFromItemized(this.getLineItems());
  }

  getFuelType(): FuelType {
    return this.options.fuelType;
  }
  getFuelUsage(): number {
    return this.options.fuelUsage;
  }
  getFuelUnit(): string {
    return this.options.fuelUnit;
  }
}

function* eachMonthInclusive(
  from: DateTime,
  to: DateTime
): Generator<[DateTime, DateTime]> {
  let monthStart = from.startOf("month");
  while (monthStart < to) {
    const monthEnd = monthStart.endOf("month");
    yield [monthStart, monthEnd];
    monthStart = monthStart.plus({ months: 1 });
  }
}

class SimpleMonthlyUsageTracker {
  constructor(
    private readonly options: {
      fixedCostPerMonth: number;
      fuelType: FuelType;
      fuelUnit: string;
      fixedCost: number;
      costPerFuelUnit: number;
    }
  ) {}

  private usageByMonth: {
    [yyyymm: string]: number;
  } = {};

  private monthKeyFor(localTime: DateTime): string {
    // We could use luxon's DateTime.toFormat here, but this is much much faster
    return `${localTime.year}-${localTime.month}`;
  }

  recordUsage(amount: number, localTime: DateTime): void {
    if (amount < 0) {
      throw new Error(
        `Cannot record using negative amounts of fuel. Received: ${amount} ${this.options.fuelUnit}`
      );
    }
    const key = this.monthKeyFor(localTime);
    this.usageByMonth[key] = (this.usageByMonth[key] || 0) + amount;
  }

  getBills(from: DateTime, to: DateTime): EnergyBill[] {
    const bills: EnergyBill[] = [];
    for (let [monthStart, monthEnd] of eachMonthInclusive(from, to)) {
      const usageForMonth =
        this.usageByMonth[this.monthKeyFor(monthStart)] || 0;
      // NOTE: We intentionally do not skip this iteration if usageForMonth is
      // empty. This allows bills to be created with a fixed cost even when
      // usage is zero.

      bills.push(
        new SimpleFuelBill({
          billingPeriodStart: monthStart,
          billingPeriodEnd: monthEnd,
          fuelUsage: usageForMonth,
          fuelType: this.options.fuelType,
          fuelUnit: this.options.fuelUnit,
          fixedCost: this.options.fixedCostPerMonth,
          costPerFuelUnit: this.options.costPerFuelUnit,
        })
      );
    }
    return bills;
  }
}

export class SimpleNaturalGasUtilityPlan implements NaturalGasUtilityPlan {
  private readonly usageTracker: SimpleMonthlyUsageTracker;

  constructor(
    private readonly options: {
      fixedCostPerMonth: number;
      costPerCcf: number;
    }
  ) {
    this.usageTracker = new SimpleMonthlyUsageTracker({
      fixedCostPerMonth: options.fixedCostPerMonth,
      fuelType: "natural gas",
      fuelUnit: "ccf",
      fixedCost: options.fixedCostPerMonth,
      costPerFuelUnit: options.costPerCcf,
    });
  }

  recordNaturalGasUsageCcf(ccf: number, localTime: DateTime): void {
    this.usageTracker.recordUsage(ccf, localTime);
  }

  getBills(from: DateTime, to: DateTime): EnergyBill[] {
    return this.usageTracker.getBills(from, to);
  }
}

export class SimpleElectricalUtilityPlan implements ElectricalUtilityPlan {
  private readonly usageTracker: SimpleMonthlyUsageTracker;
  constructor(
    private readonly options: {
      fixedCostPerMonth: number;
      costPerKwh: number;
    }
  ) {
    this.usageTracker = new SimpleMonthlyUsageTracker({
      fixedCostPerMonth: options.fixedCostPerMonth,
      fuelType: "electricity",
      fuelUnit: "kWh",
      fixedCost: options.fixedCostPerMonth,
      costPerFuelUnit: options.costPerKwh,
    });
  }

  recordElectricityUsageKwh(kwh: number, localTime: DateTime): void {
    this.usageTracker.recordUsage(kwh, localTime);
  }

  getBills(from: DateTime, to: DateTime): EnergyBill[] {
    return this.usageTracker.getBills(from, to);
  }
}

export class TimeOfUseBill implements EnergyBill {
  constructor(
    private readonly options: {
      billingPeriodStart: DateTime;
      billingPeriodEnd: DateTime;
      fuelUnit: string;
      fuelType: FuelType;
      fixedCost: number;
      periods: {
        name: string;
        fuelUsage: number;
        costPerFuelUnit: number;
      }[];
    }
  ) {}

  getBillingPeriodStart(): DateTime {
    return this.options.billingPeriodStart;
  }
  getBillingPeriodEnd(): DateTime {
    return this.options.billingPeriodEnd;
  }

  getLineItems(): BillingLineItem[] {
    return [
      { description: "Fixed charges", amount: this.options.fixedCost },
    ].concat(
      this.options.periods.map((p) => ({
        description: `${p.fuelUsage.toFixed(2)} ${this.options.fuelUnit} (${
          p.name
        }, at ${p.costPerFuelUnit}/${this.options.fuelUnit})`,
        amount: p.fuelUsage * p.costPerFuelUnit,
      }))
    );
  }

  getTotalCost(): number {
    return getTotalFromItemized(this.getLineItems());
  }

  getFuelType(): FuelType {
    return this.options.fuelType;
  }
  getFuelUsage(): number {
    return this.options.periods.reduce((v, p) => v + p.fuelUsage, 0);
  }
  getFuelUnit(): string {
    return this.options.fuelUnit;
  }
}

export interface TimeOfUsePeriod {
  name: string;
  costPerKwh: number;
  inPeriod(localTime: DateTime): boolean;
}

export class TimeOfUseElectricalUtilityPlan implements ElectricalUtilityPlan {
  constructor(
    private readonly options: {
      fixedCostPerMonth: number;
      periods: TimeOfUsePeriod[];
    }
  ) {}

  private usageByMonth: {
    [yyyymm: string]: { [periodName: string]: number };
  } = {};

  private monthKeyFor(localTime: DateTime): string {
    // We could use luxon's DateTime.toFormat here, but this is much much faster
    return `${localTime.year}-${localTime.month}`;
  }

  private timeOfUsePeriodFor(localTime: DateTime): TimeOfUsePeriod {
    for (let period of this.options.periods) {
      if (period.inPeriod(localTime)) {
        return period;
      }
    }
    throw new Error(
      `No time of use period applied for ${localTime.toString()}`
    );
  }

  recordElectricityUsageKwh(kWh: number, localTime: DateTime): void {
    if (kWh < 0) {
      throw new Error(
        `Cannot record using negative amounts of electricity. Received: ${kWh} kWh`
      );
    }

    const key = this.monthKeyFor(localTime);
    const period = this.timeOfUsePeriodFor(localTime);
    if (!(key in this.usageByMonth)) {
      this.usageByMonth[key] = {};
    }
    let month = this.usageByMonth[key];
    month[period.name] = (month[period.name] || 0) + kWh;
  }

  getBills(from: DateTime, to: DateTime): EnergyBill[] {
    const bills: EnergyBill[] = [];

    for (let [monthStart, monthEnd] of eachMonthInclusive(from, to)) {
      const usageForMonth =
        this.usageByMonth[this.monthKeyFor(monthStart)] || {};
      // NOTE: We intentionally do not skip this iteration if usageForMonth is
      // empty. This allows bills to be created with a fixed cost even when
      // usage is zero.

      bills.push(
        new TimeOfUseBill({
          billingPeriodStart: monthStart,
          billingPeriodEnd: monthEnd,
          fuelType: "electricity",
          fuelUnit: "kWh",
          fixedCost: this.options.fixedCostPerMonth,
          periods: this.options.periods.map((p) => {
            return {
              name: p.name,
              fuelUsage: usageForMonth[p.name] || 0,
              costPerFuelUnit: p.costPerKwh,
            };
          }),
        })
      );
    }
    return bills;
  }
}

// TODO(jlfwong): Tiered usage plans
