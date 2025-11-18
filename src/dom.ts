import { getNewlineRangeList } from "./Range";

function getTextSegmentsAroundCaret() {
  // @owner [P1] windowへ強依存し純粋関数ではない
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

  // @owner [P1] グローバルAPIへ直接アクセスしておりテストしにくい
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
  // @owner [P1] 同上
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
  // @owner [P1] window依存
  const selection = window.getSelection();
  if (!selection) {
    return true;
  }
  return selection.anchorOffset === 0;
}

export function getCaretPositionInBlock(
  selection: Selection | null,
): CursorPosition | undefined {
  if (!selection) return undefined;

  const wholeText = getTextFromNote(selection.anchorNode);
  const anchorOffset = selection.anchorOffset;
  const newlines = Array.from(wholeText.matchAll(/\n/g));
  return { newlines, wholeText, anchorOffset };
}

type CursorPosition = {
  wholeText: string;
  newlines: RegExpExecArray[];
  anchorOffset: number;
};

function getTextFromNote(node: Node | null): string {
  if (!node) return "";
  const isTextNode = node.nodeType === Node.TEXT_NODE;
  if (isTextNode) {
    return (node as Text).wholeText ?? "";
  }
  return node.textContent ?? "";
}

/**
 * Get the offset of the cursor from the start of the line in a div.
 */
export function getCurrentLineOffset(element: HTMLElement): number {
  // @owner [P1] window依存
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

  // @owner [P1] window依存
  const selection = window.getSelection();
  if (!selection) {
    return;
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

function getNearestCaretOffset(x: number, y: number) {
  // https://developer.mozilla.org/ja/docs/Web/API/Document/caretPositionFromPoint
  // @owner [P1] document APIも直接アクセス
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
