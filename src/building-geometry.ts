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
    floorSpaceSqFt: number;
    ceilingHeightFt: number;
    numStories: number;
    lengthToWidthRatio: number;
  }) {
    const { floorSpaceSqFt, ceilingHeightFt, numStories, lengthToWidthRatio } =
      geometry;

    const footPrintSquareFeet = floorSpaceSqFt / numStories;
    const footPrintLengthFeet = Math.sqrt(
      footPrintSquareFeet / lengthToWidthRatio
    );
    const footPrintWidthFeet = footPrintSquareFeet / footPrintLengthFeet;
    const perimeterFeet = footPrintLengthFeet * 2 + footPrintWidthFeet * 2;

    const exteriorWallsAndWindowsSquareFeet =
      perimeterFeet * ceilingHeightFt * numStories;

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

    const airVolumeCubicFt = footPrintSquareFeet * ceilingHeightFt * numStories;

    // Specific heat capacity of air
    const airBtusPerLbDegreeF = 0.24;

    // TODO(jlfwong): This varies with elevation
    const airLbsPerCubicFoot = 0.075;

    this.btusPerDegreeF =
      airVolumeCubicFt * airBtusPerLbDegreeF * airLbsPerCubicFoot;
  }
}
