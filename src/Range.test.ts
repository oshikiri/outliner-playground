import { describe, expect, it } from "vitest";

import { Range, getNewlineRangeset } from "./Range";

describe("Range", () => {
  it("contains boundaries inclusively", () => {
    const range = new Range(1, 3);
    expect(range.containsInclusive(1)).toBe(true);
    expect(range.containsInclusive(3)).toBe(true);
    expect(range.containsInclusive(0)).toBe(false);
  });
});

describe("getNewlineRangeset", () => {
  it("returns null when content is empty", () => {
    expect(getNewlineRangeset("").getLastRange()).toBeNull();
  });

  it("returns an inclusive range when no newline exists", () => {
    const ranges = getNewlineRangeset("abc").getRanges();
    expect(ranges).toHaveLength(1);
    expect(ranges[0]?.l).toBe(0);
    expect(ranges[0]?.r).toBe(3);
  });

  it("captures the trailing segment after the last newline", () => {
    const ranges = getNewlineRangeset("abc\ndef").getRanges();
    expect(ranges).toHaveLength(2);
    expect(ranges[0]?.l).toBe(0);
    expect(ranges[0]?.r).toBe(3);
    expect(ranges[1]?.l).toBe(4);
    expect(ranges[1]?.r).toBe(7);
  });
});
