import { getNewlineRangeList } from "./Range";

function getTextSegmentsAroundCaret() {
  const selection: Selection | null = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return { beforeText: "", afterText: "", caretOffset: 0 };
  }

  const range = selection.getRangeAt(0);
  const text = range.startContainer.textContent ?? "";
  const beforeText = text.substring(0, range.startOffset);
  const afterText = text.substring(range.endOffset);
  return { beforeText, afterText, caretOffset: range.startOffset };
}

function clampOffsetToTextLength(node: HTMLElement, startOffset: number) {
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

  const lastlineRange = getNewlineRangeList(content).getLastRange();
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

export function getCaretPositionInBlock(selection: Selection | null): CursorPosition | undefined {
  if (!selection) return undefined;

  // [P1] @owner: selection.anchorNode は空ブロックなどで Element になり得るため Text 前提のキャストはクラッシュする。nodeType を確認し安全にフォールバックすること。
  const text: Text = selection.anchorNode as Text;
  const wholeText = text.wholeText || "";
  const anchorOffset = selection.anchorOffset;
  const newlines = Array.from(wholeText.matchAll(/\n/g));
  return { newlines, wholeText, anchorOffset };
}

type CursorPosition = {
  wholeText: string;
  newlines: RegExpExecArray[];
  anchorOffset: number;
};

/**
 * Get the offset of the cursor from the start of the line in a div.
 *
 * [P3] @owner: 折返し（wrap）を考慮するには Range.getClientRects() で視覚行ベースに再実装する。
 */
export function getCurrentLineOffset(element: HTMLElement): number {
  const selection: Selection | null = window.getSelection();
  if (!selection) {
    return 0;
  }

  const range = selection.getRangeAt(0);
  return range.startOffset;
}

function setCaretOffset(node: HTMLElement, offset: number) {
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
  // https://developer.mozilla.org/ja/docs/Web/API/Document/caretPositionFromPoint
  const caretPosition = document.caretPositionFromPoint?.(x, y);
  if (caretPosition) {
    return caretPosition?.offset;
  }

  // https://developer.mozilla.org/ja/docs/Web/API/Document/caretRangeFromPoint
  const caretRange = document.caretRangeFromPoint?.(x, y);
  if (caretRange) {
    return caretRange.startOffset;
  }

  return null;
}

export {
  clampOffsetToTextLength,
  setCaretOffset,
  getTextSegmentsAroundCaret,
  getNearestCaretOffset,
};
