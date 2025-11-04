// [P2] @owner: DOM の `Range` と名称が衝突しやすい。`TextRange`/`CharRange`、`RangeSet` -> `RangeList` 等を検討。
export class RangeSet {
  constructor(private ranges: Range[]) {}

  getRanges(): Range[] {
    return [...this.ranges];
  }

  pushRange(l: number, r: number): void {
    this.ranges.push(new Range(l, r));
  }

  getLastRange(): Range | null {
    if (this.ranges.length === 0) {
      return null;
    }
    return this.ranges[this.ranges.length - 1];
  }
}

/**
 * Range(l, r) represents a range from l to r.
 */
// [P2] @owner: `Range` は DOM 型と紛らわしいため `TextRange`/`CharRange` を検討。
export class Range {
  constructor(
    // [P2] @owner: `l/r` は意味が不明瞭。`start/end` に変更すると明確。
    public l: number,
    public r: number,
  ) {}
  containsInclusive(x: number): boolean {
    return this.l <= x && x <= this.r;
  }
}

/**
 * Example: content = "abc\ndef"
 *
 * |a|b|c|\n|
 * 0 1 2 3  4
 *
 * |d|e|f|
 * 4 5 6 7
 */
// [P2] @owner: `getNewlineRangeset` -> `getLineRanges` や `getNewlineRangeSet`（大文字小文字）に統一。
export function getNewlineRangeset(content: string): RangeSet {
  const rangeset: RangeSet = new RangeSet([]);
  const regex = /(\n)/g;
  let match: RegExpExecArray | null;

  let l = 0;
  while ((match = regex.exec(content)) !== null) {
    rangeset.pushRange(l, match.index);
    l = match.index + 1;
  }

  if (l < content.length) {
    rangeset.pushRange(l, content.length);
  }

  return rangeset;
}
