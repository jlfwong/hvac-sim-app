import { DateTime } from "luxon";
import {
  SimpleNaturalGasUtilityPlan,
  TimeOfUseElectricalUtilityPlan,
  TimeOfUsePeriod,
} from "./billing";

describe("SimpleNaturalGasUtiltyPlan", () => {
  test("should calculate bills for recorded natural gas usage", () => {
    const plan = new SimpleNaturalGasUtilityPlan({
      fixedCostPerMonth: 20,
      costPerCcf: 1.5,
    });
    plan.recordNaturalGasUsageCcf(1, DateTime.fromISO("2022-01-15"));
    plan.recordNaturalGasUsageCcf(2, DateTime.fromISO("2022-01-20"));
    plan.recordNaturalGasUsageCcf(3, DateTime.fromISO("2022-02-01"));
    plan.recordNaturalGasUsageCcf(5, DateTime.fromISO("2022-02-03"));
    plan.recordNaturalGasUsageCcf(7, DateTime.fromISO("2022-04-11"));
    plan.recordNaturalGasUsageCcf(11, DateTime.fromISO("2022-04-12"));
    const bills = plan.getBills(
      DateTime.fromISO("2022-01-01"),
      DateTime.fromISO("2022-05-05")
    );

    expect(bills.length).toBe(5);

    expect(bills[0].getBillingPeriodStart().toISODate()).toEqual("2022-01-01");
    expect(bills[0].getBillingPeriodEnd().toISODate()).toEqual("2022-01-31");
    expect(bills[0].getFuelType()).toBe("natural gas");
    expect(bills[0].getFuelUnit()).toBe("ccf");
    expect(bills[0].getFuelUsage()).toBe(3);
    expect(bills[0].getTotalCost()).toBe(20 + 3 * 1.5);

    expect(bills[0].getLineItems()).toEqual([
      {
        description: "Fixed charges",
        amount: 20,
      },
      {
        description: "3.00 ccf (at 1.5/ccf)",
        amount: 3 * 1.5,
      },
    ]);

    expect(bills[1].getBillingPeriodStart().toISODate()).toEqual("2022-02-01");
    expect(bills[1].getBillingPeriodEnd().toISODate()).toEqual("2022-02-28");
    expect(bills[1].getFuelUsage()).toBe(8);
    expect(bills[1].getTotalCost()).toBe(20 + 8 * 1.5);

    expect(bills[2].getBillingPeriodStart().toISODate()).toEqual("2022-03-01");
    expect(bills[2].getFuelUsage()).toBe(0);
    expect(bills[2].getTotalCost()).toBe(20);

    expect(bills[3].getBillingPeriodStart().toISODate()).toEqual("2022-04-01");
    expect(bills[3].getFuelUsage()).toBe(18);
  });
});

describe("TimeOfUseElectricalUtilityPlan", () => {
  test("calculates cost based on time of use", () => {
    const periods: TimeOfUsePeriod[] = [
      {
        name: "before noon",
        costPerKwh: 0.1,
        inPeriod: (localTime: DateTime) => {
          return localTime.hour < 12;
        },
      },
      {
        name: "after noon",
        costPerKwh: 0.2,
        inPeriod: (localTime: DateTime) => {
          return localTime.hour >= 12;
        },
      },
    ];

    const utilityPlan = new TimeOfUseElectricalUtilityPlan({
      fixedCostPerMonth: 50,
      periods: periods,
    });

    // January before noon
    utilityPlan.recordElectricityUsageKwh(
      100,
      DateTime.local(2022, 1, 15, 10, 0)
    );
    utilityPlan.recordElectricityUsageKwh(
      200,
      DateTime.local(2022, 1, 15, 11, 0)
    );

    // January after noon
    utilityPlan.recordElectricityUsageKwh(
      400,
      DateTime.local(2022, 1, 15, 14, 0)
    );

    // February before noon
    utilityPlan.recordElectricityUsageKwh(
      150,
      DateTime.local(2022, 2, 1, 0, 0)
    );

    const bills = utilityPlan.getBills(
      DateTime.local(2022, 1, 1),
      DateTime.local(2022, 2, 28)
    );

    // Assert the calculated cost for each bill
    expect(bills.length).toBe(2);
    expect(bills[0].getTotalCost()).toEqual(50 + (100 + 200) * 0.1 + 400 * 0.2);
    expect(bills[1].getTotalCost()).toEqual(50 + 150 * 0.1);

    expect(bills[0].getLineItems()).toEqual([
      {
        description: "Fixed charges",
        amount: 50,
      },
      {
        description: "300.00 kWh (before noon, at 0.1/kWh)",
        amount: 300 * 0.1,
      },
      {
        description: "400.00 kWh (after noon, at 0.2/kWh)",
        amount: 400 * 0.2,
      },
    ]);
  });

  test("throws error if none of the periods match", () => {
    const periods: TimeOfUsePeriod[] = [
      {
        name: "before noon",
        costPerKwh: 0.1,
        inPeriod: (localTime: DateTime) => {
          return localTime.hour < 12;
        },
      },
      {
        name: "after noon",
        costPerKwh: 0.2,
        inPeriod: (localTime: DateTime) => {
          return localTime.hour > 12;
        },
      },
    ];

    const utilityPlan = new TimeOfUseElectricalUtilityPlan({
      fixedCostPerMonth: 50,
      periods: periods,
    });

    expect(() => {
      utilityPlan.recordElectricityUsageKwh(
        100,
        DateTime.local(2022, 1, 1, 12, 0)
      );
    }).toThrow("No time of use period applied");
  });
});
