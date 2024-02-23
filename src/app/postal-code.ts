export class PostalCode {
  private province: string;

  constructor(private code: string) {
    const firstLetter = code.charAt(0).toUpperCase();
    const codes: { [key: string]: string } = {
      A: "NL", // Newfoundland and Labrador
      B: "NS", // Nova Scotia
      C: "PE", // Prince Edward Island
      E: "NB", // New Brunswick
      G: "QC", // Quebec
      H: "QC", // Quebec
      J: "QC", // Quebec
      K: "ON", // Ontario
      L: "ON", // Ontario
      M: "ON", // Ontario
      N: "ON", // Ontario
      P: "ON", // Ontario
      R: "MB", // Manitoba
      S: "SK", // Saskatchewan
      T: "AB", // Alberta
      V: "BC", // British Columbia
      X: "NT", // Northwest Territories
      Y: "YT", // Yukon
    };

    // X can also represent Nunavut, so we check the second character
    if (firstLetter === "X" && code.charAt(1).toUpperCase() === "0") {
      this.province = "NU"; // Nunavut
    } else {
      if (!(firstLetter in codes)) {
        throw new Error(`Unrecognized postal code ${code}`);
      }
      this.province = codes[firstLetter];
    }
  }
}
