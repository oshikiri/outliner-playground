import { getNewlineRangeset } from "./Range";

function getTextSegmentsAroundCaret() {
  const selection: Selection | null = window.getSelection();
  if (!selection) {
    return { beforeText: "", afterText: "", caretOffset: 0 };
  }

  // [P2] @owner: selection.rangeCount のチェックを追加し、空レンジの際は安全に空文字を返すこと。
  const range = selection.getRangeAt(0);
  const text = range.startContainer.textContent;
  const beforeText = text?.substring(0, range.startOffset);
  const afterText = text?.substring(range.endOffset);
  return { beforeText, afterText, caretOffset: range.startOffset };
}

// [P3] @owner: `getOffset` は意味が広い。`clampOffsetToTextLength` 等で意図（上限丸め）を明確に。
function getOffset(node: HTMLElement, startOffset: number) {
  const nextInnerText = node.innerText || "";
  if (startOffset >= nextInnerText.length) {
    return nextInnerText.length;
  }
  return startOffset;
}

export function isCaretAtLastLine(content: string): boolean {
  if (content.length === 0) {
    return true;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }
  const caretOffset = selection.anchorOffset;

  const lastlineRange = getNewlineRangeset(content).getLastRange();
  if (!lastlineRange) {
    return false;
  }
  return lastlineRange.containsInclusive(caretOffset);
}

export function isCaretAtFirstLine(): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const pos = getCaretPositionInBlock(selection);
  const isAtTop = pos?.newlines?.every?.((newline) => {
    return pos.anchorOffset <= newline.index;
  });

  if (isAtTop === undefined) {
    return true;
  }
  return isAtTop;
}

export function caretIsAtBlockStart(): boolean {
  const selection = window.getSelection();
  if (!selection) {
    return true;
  }
  return selection.anchorOffset === 0;
}

// [P2] @owner: 返り値の型（CursorPosition）を定義し、プロパティ名も `lineBreaks` など意味的に。
export function getCaretPositionInBlock(selection: Selection | null) {
  if (!selection) return {};

  const text: Text = selection.anchorNode as Text;
  const wholeText = text.wholeText || "";
  const anchorOffset = selection.anchorOffset;
  const newlines = Array.from(wholeText.matchAll(/\n/g));
  return { newlines, wholeText, anchorOffset };
}

/**
 * Get the offset of the cursor from the start of the line in a div.
 *
 * [P3] @owner: 折返し（wrap）を考慮するには Range.getClientRects() で視覚行ベースに再実装する。
 */
// [P3] @owner: selection の現在位置を返す関数名として `getCurrentLineOffset` などの方が意図が伝わる。
export function getCaretOffsetFromLineStart(element: HTMLElement): number {
  const selection: Selection | null = window.getSelection();
  if (!selection) {
    return 0;
  }

  const range = selection.getRangeAt(0);
  return range.startOffset;
}

// [P3] @owner: `setSelectionOffset` / `setCaretOffset` の方が目的が明確。
function setCaret(node: HTMLElement, offset: number) {
  const range = document.createRange();
  range.setStart(node, offset);
  range.setEnd(node, offset);

  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

function getNearestCaretOffset(x: number, y: number) {
  // [P1] @owner: caretPositionFromPoint 非対応ブラウザでは caretRangeFromPoint へフォールバックすること。
  const caretPosition = document.caretPositionFromPoint(x, y);
  return caretPosition?.offset;
}

export {
  getOffset,
  setCaret,
  getTextSegmentsAroundCaret,
  getNearestCaretOffset,
};
