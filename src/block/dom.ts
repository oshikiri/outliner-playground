import { getNewlineRangeList } from "../Range";

type CaretTextSegments = {
  beforeText: string;
  afterText: string;
  caretOffset: number;
};

export function getTextSegmentsAroundCaret(
  selection: Selection | null,
): CaretTextSegments {
  // [P3] Selection依存で純粋関数にしづらくテストしにくいので、必要な値(テキスト/offset)を引数化したい。
  if (!selection || selection.rangeCount === 0) {
    return { beforeText: "", afterText: "", caretOffset: 0 };
  }

  const range = selection.getRangeAt(0);
  const text = range.startContainer.textContent ?? "";
  const beforeText = text.substring(0, range.startOffset);
  const afterText = text.substring(range.endOffset);
  return { beforeText, afterText, caretOffset: range.startOffset };
}

export function clampOffsetToTextLength(
  node: HTMLElement,
  startOffset: number,
): number {
  const nextInnerText = node.innerText || "";
  if (startOffset >= nextInnerText.length) {
    return nextInnerText.length;
  }
  return startOffset;
}

export function isCaretAtLastLine(
  content: string,
  selection: Selection | null,
): boolean {
  // [P2] 例: "abc\n" の末尾空行だと caretOffset=4 が最終行レンジに入らず false になり、下移動が発火しない。
  if (content.length === 0) {
    return true;
  }

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

export function isCaretAtFirstLine(selection: Selection | null): boolean {
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

export function caretIsAtBlockStart(selection: Selection | null): boolean {
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
export function getCurrentLineOffset(
  element: HTMLElement,
  selection: Selection | null,
): number {
  // [P2] element を使っておらず selection のみで決まるため、将来的な仕様と実装の意図を整理したい。
  if (!selection) {
    return 0;
  }

  const range = selection.getRangeAt(0);
  return range.startOffset;
}

export function setCaretOffset(
  node: HTMLElement,
  offset: number,
  selection: Selection | null,
) {
  // [P3] document.createRange に依存していてテストでスタブ化しづらいので注入可能にしたい。
  const range = document.createRange();
  range.setStart(node, offset);
  range.setEnd(node, offset);

  if (!selection) {
    return;
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

export function getNearestCaretOffset(
  document: Document,
  x: number,
  y: number,
): number | null {
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
