// This is an extremely simple building model -- a rectangular prism with
// windows.
export class BuildingGeometry {
  // The square footage of all the windows in the house.
  readonly windowsSqFt: number;

  // The square footage of all exterior facing walls in the house.
  readonly exteriorWallsSqFt: number;

  // The square footage of the upper-most ceiling. This would be
  // roughly the square footage of a flat roof.
  readonly ceilingSqFt: number;

  // The square footage of the exterior facing floors
  readonly exteriorFloorSqFt: number;

  // The specific heat capacity of the building. How many BTUs does it take to
  // raise the temperature of the house by one degree fahrenheit?
  readonly btusPerDegreeF: number;

  constructor(geometry: {
    // Total floor space square feet, including the basement
    floorSpaceSqFt: number;

    // Ceiling height. If it's variable, use the average.
    ceilingHeightFt: number;

    // Number of above ground stories. A two story building with a basement (so
    // 3 floor total) would have numAboveGroundStories = 2.
    numAboveGroundStories: number;

    // What's the ratio of the house's length to width? A value of 3 would mean
    // the house is 3 times as long as it is wide.
    lengthToWidthRatio: number;

    // True if the building has a basement
    hasConditionedBasement: boolean;
  }) {
    const {
      floorSpaceSqFt,
      ceilingHeightFt,
      numAboveGroundStories,
      lengthToWidthRatio,
      hasConditionedBasement,
    } = geometry;

    const numFloors = numAboveGroundStories + (hasConditionedBasement ? 1 : 0);

    const footPrintSquareFeet = floorSpaceSqFt / numFloors;
    const footPrintLengthFeet = Math.sqrt(
      footPrintSquareFeet / lengthToWidthRatio
    );
    const footPrintWidthFeet = footPrintSquareFeet / footPrintLengthFeet;
    const perimeterFeet = footPrintLengthFeet * 2 + footPrintWidthFeet * 2;

    const exteriorWallsAndWindowsSquareFeet =
      perimeterFeet * ceilingHeightFt * numAboveGroundStories;

    // From Manual J
    // TODO(jlfwong): Find the source for this
    const percentageWallsThatAreWindows = 20;

    const windowsSquareFeet =
      (percentageWallsThatAreWindows / 100.0) *
      exteriorWallsAndWindowsSquareFeet;
    const exteriorWallsSquareFeeet =
      exteriorWallsAndWindowsSquareFeet - windowsSquareFeet;

    this.exteriorWallsSqFt = exteriorWallsSquareFeeet;
    this.windowsSqFt = windowsSquareFeet;
    this.ceilingSqFt = footPrintSquareFeet;
    this.exteriorFloorSqFt = footPrintSquareFeet;

    const airVolumeCubicFt = footPrintSquareFeet * ceilingHeightFt * numFloors;

    // Specific heat capacity of air
    const airBtusPerLbDegreeF = 0.24;

    // TODO(jlfwong): This varies with elevation
    const airLbsPerCubicFoot = 0.075;

    // Data from beestat during while all heating equipment was off. Heating setpoint 20.0C
    // - Friday, Feb 9 @ 1:00pm EST: inside 20.8C, outside 7.7C
    // - Friday, Feb 9 @ 9:00pm EST: inside 19.3C, outside 5.5C
    //
    // So in 8 hours, there was only a 1.5C heat loss, or 0.34 deg F/hr.
    //
    // The BTU loss calculation during that time based on infiltration and
    // convection/conduction is ballpark 5000 BTUs/hr (pluggin in the
    // temperature differential and assumptions about the building envelope).
    //
    // That works out to around 15,000 BTU/deg F.
    //
    // The same assumptions about building envelope suggest a thermal mass of
    // air of 486 BTU/deg F. If that's right, that would assume that the thermal
    // mass of the house is only 3% air. This is also, of course, making tons of
    // assumptions about the rate of equilibriation.
    const fractionOfThermalMassGivenToAir = 0.03;

    this.btusPerDegreeF =
      (airVolumeCubicFt * airLbsPerCubicFoot * airBtusPerLbDegreeF) /
      fractionOfThermalMassGivenToAir;
  }
}
