import { describe, expect, it } from "vitest";

import { IndexRange, getNewlineRanges } from "./Range";

describe("IndexRange", () => {
  it("contains boundaries inclusively", () => {
    const range = new IndexRange(1, 3);
    expect(range.containsInclusive(1)).toBe(true);
    expect(range.containsInclusive(3)).toBe(true);
    expect(range.containsInclusive(0)).toBe(false);
  });
});

describe("getNewlineRanges", () => {
  it("returns an empty array when content is empty", () => {
    expect(getNewlineRanges("")).toEqual([]);
  });

  it("returns an inclusive range when no newline exists", () => {
    const ranges = getNewlineRanges("abc");
    expect(ranges).toHaveLength(1);
    expect(ranges[0]?.l).toBe(0);
    expect(ranges[0]?.r).toBe(3);
  });

  it("captures the trailing segment after the last newline", () => {
    const ranges = getNewlineRanges("abc\ndef");
    expect(ranges).toHaveLength(2);
    expect(ranges[0]?.l).toBe(0);
    expect(ranges[0]?.r).toBe(3);
    expect(ranges[1]?.l).toBe(4);
    expect(ranges[1]?.r).toBe(7);
  });

  it("does not include an empty trailing line when content ends with newline", () => {
    const ranges = getNewlineRanges("abc\n");
    expect(ranges).toHaveLength(1);
    expect(ranges[0]?.l).toBe(0);
    expect(ranges[0]?.r).toBe(3);
  });

  it("creates an empty first segment when content starts with newline", () => {
    const ranges = getNewlineRanges("\nabc");
    expect(ranges).toHaveLength(2);
    expect(ranges[0]?.l).toBe(0);
    expect(ranges[0]?.r).toBe(0);
    expect(ranges[1]?.l).toBe(1);
    expect(ranges[1]?.r).toBe(4);
  });

  it("keeps empty segments for consecutive newlines", () => {
    const ranges = getNewlineRanges("a\n\nb");
    expect(ranges).toHaveLength(3);
    expect(ranges[0]?.l).toBe(0);
    expect(ranges[0]?.r).toBe(1);
    expect(ranges[1]?.l).toBe(2);
    expect(ranges[1]?.r).toBe(2);
    expect(ranges[2]?.l).toBe(3);
    expect(ranges[2]?.r).toBe(4);
  });

  it("returns one empty segment when content is only a newline", () => {
    const ranges = getNewlineRanges("\n");
    expect(ranges).toHaveLength(1);
    expect(ranges[0]?.l).toBe(0);
    expect(ranges[0]?.r).toBe(0);
  });
});
