import { describe, expect, it } from "vite-plus/test";
import { choiceMatchingAddress, isAreaResult } from "./address-match";

describe("address matching", () => {
  it("treats a street or postcode result as an area", () => {
    expect(isAreaResult("residential", "yes")).toBe(true);
    expect(isAreaResult("trunk", "trunk")).toBe(true);
    expect(isAreaResult("office", "government")).toBe(false);
  });

  it("selects the one plot whose label contains the house number and street", () => {
    const choices = [{ label: "11, The Close, CR8 2QD" }, { label: "13, The Close, CR8 2QD" }];
    expect(choiceMatchingAddress("13 The Close", choices)?.label).toBe("13, The Close, CR8 2QD");
  });

  it("does not guess when the typed name is missing from every label", () => {
    const choices = [{ label: "1 Woodwicks, GU6 7HN" }, { label: "2 Woodwicks, GU6 7HN" }];
    expect(choiceMatchingAddress("Goldcrest", choices)).toBeNull();
    expect(choiceMatchingAddress("13 The Close", [{ label: "The Close, CR8 2QD" }])).toBeNull();
  });
});
