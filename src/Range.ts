/**
 * Range(l, r) represents a range from l to r.
 */
export class IndexRange {
  constructor(
    public l: number,
    public r: number,
  ) {}
  containsInclusive(x: number): boolean {
    return this.l <= x && x <= this.r;
  }
}

/**
 * Split `content` into index ranges per newline-delimited segment.
 *
 * Example: content = "abc\ndef"
 *
 * |a|b|c|\n|
 * 0 1 2 3  4
 *
 * |d|e|f|
 * 4 5 6 7
 *
 * Returns: [[0, 3], [4, 7]]
 *
 * @param content - Raw text that may include "\n".
 * @returns IndexRange[] where each range is [l, r], and r is the index of
 * "\n" or content.length for the final segment.
 */
export function getNewlineRanges(content: string): IndexRange[] {
  const ranges: IndexRange[] = [];
  const regex = /\n/g;
  let match: RegExpExecArray | null;

  let l = 0;
  while ((match = regex.exec(content)) !== null) {
    ranges.push(new IndexRange(l, match.index));
    l = match.index + 1;
  }

  if (l < content.length) {
    ranges.push(new IndexRange(l, content.length));
  }

  return ranges;
}
