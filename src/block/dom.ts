import { getNewlineRangeList } from "../Range";

type CaretTextSegments = {
  beforeText: string;
  afterText: string;
  caretOffset: number;
};

export function getTextSegmentsAroundCaret(
  selection: Selection | null,
): CaretTextSegments {
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
  const nextInnerText = node.innerText ?? "";
  if (startOffset >= nextInnerText.length) {
    return nextInnerText.length;
  }
  return startOffset;
}

export function isCaretAtLastLine(
  content: string,
  selection: Selection | null,
): boolean {
  if (content.length === 0) {
    return true;
  }

  if (!selection || selection.rangeCount === 0) {
    return false;
  }
  const caretOffset = selection.anchorOffset;
  if (caretOffset === content.length) {
    return true;
  }

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
  const isAtTop = pos?.newlines.every((newline) => {
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
export function getCurrentLineOffset(selection: Selection | null): number {
  if (!selection) {
    return 0;
  }

  const range = selection.getRangeAt(0);
  return range.startOffset;
}

/**
 * Place the caret at a plain-text offset.
 *
 * @param node - A text node or a container element that owns descendant text
 * nodes.
 * @param offset - The plain-text character offset from the start of `node`.
 * When `node` is an element, the offset is resolved across descendant text
 * nodes in document order.
 * @param selection - The selection object to update. If `null`, this function
 * resolves the target position but does not mutate browser selection state.
 * @returns Nothing.
 *
 * @remarks
 * If `offset` exceeds the available text length, the caret is placed at the
 * end of the last text node. If no text node exists, the caret is placed on
 * the container itself.
 */
export function setCaretOffset(
  node: Node,
  offset: number,
  selection: Selection | null,
): void {
  const target = resolveCaretTarget(node, offset);
  const range = document.createRange();
  range.setStart(target.node, target.offset);
  range.setEnd(target.node, target.offset);

  if (!selection) {
    return;
  }
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Resolve a plain-text offset to a concrete DOM position.
 *
 * @param node - A text node or container element that defines the offset base.
 * @param offset - The plain-text character offset from the start of `node`.
 * @returns The concrete DOM node and local offset that correspond to the
 * requested plain-text position.
 *
 * @remarks
 * Descendant text nodes are traversed in document order so callers do not have
 * to depend on a specific `contentEditable` subtree shape.
 */
function resolveCaretTarget(
  node: Node,
  offset: number,
): { node: Node; offset: number } {
  if (node.nodeType === Node.TEXT_NODE) {
    const textNode = node as Text;
    return {
      node: textNode,
      offset: Math.min(offset, textNode.data.length),
    };
  }

  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let current = walker.nextNode();
  let lastTextNode: Text | null = null;

  while (current) {
    const textNode = current as Text;
    if (remaining <= textNode.data.length) {
      return { node: textNode, offset: remaining };
    }

    remaining -= textNode.data.length;
    lastTextNode = textNode;
    current = walker.nextNode();
  }

  if (lastTextNode) {
    return {
      node: lastTextNode,
      offset: lastTextNode.data.length,
    };
  }

  return {
    node,
    offset: Math.min(offset, node.childNodes.length),
  };
}

export function getNearestCaretOffset(
  document: Document,
  x: number,
  y: number,
): number | null {
  // https://developer.mozilla.org/ja/docs/Web/API/Document/caretPositionFromPoint
  const caretPosition = document.caretPositionFromPoint?.(x, y);
  if (caretPosition) {
    return caretPosition.offset;
  }

  // https://developer.mozilla.org/ja/docs/Web/API/Document/caretRangeFromPoint
  const caretRange = document.caretRangeFromPoint?.(x, y);
  if (caretRange) {
    return caretRange.startOffset;
  }
  return null;
}
