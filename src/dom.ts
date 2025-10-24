import { getNewlineRangeset } from "./Range";

function getTextsAroundCursor() {
  const selection: Selection | null = window.getSelection();
  if (!selection) {
    return { beforeCursor: "", afterCursor: "", startOffset: 0 };
  }

  const range = selection.getRangeAt(0);
  const text = range.startContainer.textContent;
  const beforeCursor = text?.substring(0, range.startOffset);
  const afterCursor = text?.substring(range.endOffset);
  return { beforeCursor, afterCursor, startOffset: range.startOffset };
}

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

  const pos = getCursorPositionInBlock(selection);
  const isAtTop = pos?.newlines?.every?.((newline) => {
    return pos.anchorOffset <= newline.index;
  });

  if (isAtTop === undefined) {
    return true;
  }
  return isAtTop;
}

export function caretIsAtHeadOfBlock(): boolean {
  const selection = window.getSelection();
  if (!selection) {
    return true;
  }
  return selection.anchorOffset === 0;
}

export function getCursorPositionInBlock(selection: Selection | null) {
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
 * TODO: considers the case where there are multiple lines due to text wrapping.
 */
export function getOffsetFromLineStart(element: HTMLElement): number {
  const selection: Selection | null = window.getSelection();
  if (!selection) {
    return 0;
  }

  const range = selection.getRangeAt(0);
  return range.startOffset;
}

function setCursor(node: HTMLElement, offset: number) {
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

function getNearestCursorOffset(x: number, y: number) {
  const caretPosition = document.caretPositionFromPoint(x, y);
  return caretPosition?.offset;
}

export { getOffset, setCursor, getTextsAroundCursor, getNearestCursorOffset };
