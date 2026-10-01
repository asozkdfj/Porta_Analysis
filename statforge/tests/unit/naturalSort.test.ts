import { describe, expect, it } from "vitest";
import { naturalCompare, naturalSortStrings } from "../../src/renderer/src/utils/naturalSort";

describe("naturalSort", () => {
  it("orders socket-like IDs numerically", () => {
    const sorted = naturalSortStrings([
      "AI002_A_10",
      "AI002_A_2",
      "AI002_A_01",
      "AI002_B_01",
    ]);
    expect(sorted).toEqual([
      "AI002_A_01",
      "AI002_A_2",
      "AI002_A_10",
      "AI002_B_01",
    ]);
  });

  it("compares pairwise", () => {
    expect(naturalCompare("A_2", "A_10")).toBeLessThan(0);
  });
});
