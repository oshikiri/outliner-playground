import type {
  KeyboardEventHandler,
  RefObject,
  TargetedKeyboardEvent,
} from "preact";
import { useCallback } from "preact/hooks";

import type BlockEntity from "./BlockEntity";
import { createBlock } from "./BlockEntity";
import * as dom from "./dom";
import { getNewlineRangeList } from "../Range";
import type { UpdateCaretPosition } from "../state";

type CaretPosition = ReturnType<typeof dom.getCaretPositionInBlock>;
type KeydownEvent = TargetedKeyboardEvent<HTMLDivElement>;
type KeydownHandler = KeyboardEventHandler<HTMLDivElement>;

export function useBlockKeydownHandler({
  block,
  contentRef,
  splitBlockAtCaret,
  setCaretPosition,
  updateBlockById,
  getSelection,
}: UseBlockKeydownHandlerArgs): KeydownHandler {
  return useCallback(
    (event: KeydownEvent) => {
      dispatchKeydownEvent(
        event,
        createKeydownHandlerContext({
          block,
          contentRef,
          splitBlockAtCaret,
          setCaretPosition,
          updateBlockById,
          getSelection,
        }),
      );
    },
    [
      block,
      contentRef,
      getSelection,
      splitBlockAtCaret,
      setCaretPosition,
      updateBlockById,
    ],
  );
}

function createKeydownHandlerContext(
  args: UseBlockKeydownHandlerArgs,
): KeydownHandlerContext {
  return {
    ...args,
    currentElement: args.contentRef.current,
    getSelection: args.getSelection ?? (() => window.getSelection()),
  };
}

function dispatchKeydownEvent(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  if (event.key === "Enter" && !event.shiftKey) {
    handleEnter(event, context);
  } else if (event.key === "Tab") {
    handleTab(event, context);
  } else if (event.key === "ArrowDown" && event.ctrlKey) {
    handleMoveBlockDown(event, context);
  } else if (event.key === "ArrowDown") {
    handleArrowDown(event, context);
  } else if (event.key === "ArrowUp" && event.ctrlKey) {
    handleMoveBlockUp(event, context);
  } else if (event.key === "ArrowUp") {
    handleArrowUp(event, context);
  } else if (event.key === "ArrowLeft") {
    handleArrowLeft(event, context);
  } else if (event.key === "ArrowRight") {
    handleArrowRight(event, context);
  } else if (event.key === "a" && event.ctrlKey) {
    const caretPosition = dom.getCaretPositionInBlock(window.getSelection());
    goToLineStart(event, context, caretPosition);
  } else if (event.key === "e" && event.ctrlKey) {
    const caretPosition = dom.getCaretPositionInBlock(window.getSelection());
    goToLineEnd(event, context, caretPosition);
  } else if (event.key === "Backspace") {
    handleBackspace(event, context);
  }
}

function handleEnter(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  event.preventDefault();
  const { beforeText, afterText } = dom.getTextSegmentsAroundCaret(
    window.getSelection(),
  );
  const newBlock = context.splitBlockAtCaret(
    context.block.id,
    beforeText || "",
    afterText || "",
  );
  if (context.currentElement) {
    context.currentElement.innerText = beforeText || "";
  }
  context.setCaretPosition({ blockId: newBlock.id, caretOffset: 0 });
}

function handleTab(event: KeydownEvent, context: KeydownHandlerContext): void {
  event.preventDefault();

  // [P2] DOM上の最新テキストをモデルに反映してからインデント処理を行う前提。
  const updatedBlock = syncCurrentBlockContent(context);

  if (event.shiftKey) {
    const { parent, grandparent } = updatedBlock.outdent();
    if (parent) {
      context.updateBlockById(parent.id, parent);
    }
    if (grandparent) {
      context.updateBlockById(grandparent.id, grandparent);
    }
  } else {
    const parent = updatedBlock.indent();
    if (parent) {
      context.updateBlockById(parent.id, parent);
    }
  }

  const { caretOffset } = dom.getTextSegmentsAroundCaret(window.getSelection());
  context.setCaretPosition({ blockId: context.block.id, caretOffset });
}

function handleArrowDown(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  if (
    !context.currentElement ||
    !dom.isCaretAtLastLine(context.block.content, window.getSelection())
  ) {
    // [P2] 例: "abc\n" の末尾空行だと caretOffset=4 が最終行レンジに入らず、↓で次ブロックに移動しない。
    return;
  }

  event.preventDefault();
  const nextBlock = context.block.getNextBlock();
  if (!nextBlock) {
    return;
  }

  const updatedBlock = syncCurrentBlockContent(context);

  const caretOffset = dom.getCurrentLineOffset(window.getSelection());
  const lastRange = getNewlineRangeList(updatedBlock.content).getLastRange();
  const nextCaretOffset = lastRange
    ? Math.max(0, caretOffset - lastRange.l - 1)
    : 0;
  context.setCaretPosition({
    blockId: nextBlock.id,
    caretOffset: nextCaretOffset,
  });
}

function handleMoveBlockDown(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  event.preventDefault();

  const updatedBlock = syncCurrentBlockContent(context);

  const parent = updatedBlock.moveDown();
  if (parent) {
    context.updateBlockById(parent.id, parent);
  }

  const { caretOffset } = dom.getTextSegmentsAroundCaret(window.getSelection());
  context.setCaretPosition({ blockId: updatedBlock.id, caretOffset });
}

function handleArrowUp(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  if (
    !context.currentElement ||
    !dom.isCaretAtFirstLine(window.getSelection())
  ) {
    return;
  }

  event.preventDefault();
  const prevBlock = context.block.getPrevBlock();
  if (!prevBlock) {
    return;
  }
  // Root blocks are hidden, so we should not move the caret to them.
  if (prevBlock.parent === null) {
    return;
  }

  syncCurrentBlockContent(context);

  const offsetAtPrev = dom.getCurrentLineOffset(window.getSelection());
  const lastRange = getNewlineRangeList(prevBlock.content).getLastRange();
  const nextCaretOffset = lastRange
    ? Math.min(lastRange.l + offsetAtPrev + 1, lastRange.r)
    : 0;
  context.setCaretPosition({
    blockId: prevBlock.id,
    caretOffset: nextCaretOffset,
  });
}

function handleMoveBlockUp(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  event.preventDefault();

  const updatedBlock = syncCurrentBlockContent(context);

  const parent = updatedBlock.moveUp();
  if (parent) {
    context.updateBlockById(parent.id, parent);
  }

  const { caretOffset } = dom.getTextSegmentsAroundCaret(window.getSelection());
  context.setCaretPosition({ blockId: updatedBlock.id, caretOffset });
}

function syncCurrentBlockContent(context: KeydownHandlerContext): BlockEntity {
  const updatedBlock = createBlock(context.block);
  updatedBlock.content = context.currentElement?.innerText || "";
  context.updateBlockById(updatedBlock.id, updatedBlock);
  return updatedBlock;
}

function goToLineStart(
  event: KeydownEvent,
  context: KeydownHandlerContext,
  caretPosition: CaretPosition,
): void {
  event.preventDefault();

  const newlineBeforeCaret = caretPosition?.newlines?.findLast((newline) => {
    return newline.index < caretPosition.anchorOffset;
  });
  if (newlineBeforeCaret) {
    const newlineIndex = newlineBeforeCaret.index;
    context.setCaretPosition({
      blockId: context.block.id,
      caretOffset: newlineIndex + 1,
    });
  } else {
    context.setCaretPosition({ blockId: context.block.id, caretOffset: 0 });
  }
}

function goToLineEnd(
  event: KeydownEvent,
  context: KeydownHandlerContext,
  caretPosition: CaretPosition,
): void {
  event.preventDefault();

  const newlineAfterCaret = caretPosition?.newlines?.find((newline) => {
    return newline.index >= caretPosition.anchorOffset;
  });
  if (newlineAfterCaret) {
    const newlineIndex = newlineAfterCaret.index;
    context.setCaretPosition({
      blockId: context.block.id,
      caretOffset: newlineIndex,
    });
  } else {
    context.setCaretPosition({
      blockId: context.block.id,
      caretOffset: context.currentElement?.innerText.length || 0,
    });
  }
}

function handleBackspace(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  const currentContent = context.currentElement?.innerText || "";

  if (
    context.block.children.length > 0 ||
    !dom.caretIsAtBlockStart(window.getSelection())
  ) {
    return;
  }

  const prevBlock = context.block.getPrevBlock();
  if (!prevBlock) {
    return;
  }

  event.preventDefault();

  // Root blocks are hidden, so we should not move the caret to them.
  if (prevBlock.parent === null) {
    return;
  }

  const prevContentLength = prevBlock.content.length;
  // [P2] prevBlock と parent の整合性(親子関係/インデックス)が崩れていない前提で結合している。
  const [parent] = context.block.getParentAndIndex();
  if (!parent) {
    return;
  }
  const parentClone = createBlock(parent);
  const prevClone = parentClone.findBlockById(prevBlock.id);
  if (!prevClone) {
    return;
  }
  prevClone.content += currentContent;
  parentClone.children = parentClone.children.filter(
    (child) => child.id !== context.block.id,
  );

  context.updateBlockById(parentClone.id, parentClone);

  context.setCaretPosition({
    blockId: prevBlock.id,
    caretOffset: prevContentLength,
  });
}

function handleArrowLeft(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  if (!dom.caretIsAtBlockStart(window.getSelection())) {
    return;
  }

  event.preventDefault();
  const prevBlock = context.block.getPrevBlock();
  if (!prevBlock) {
    return;
  }
  // Root blocks are hidden, so we should not move the caret to them.
  if (prevBlock.parent === null) {
    return;
  }

  context.setCaretPosition({
    blockId: prevBlock.id,
    caretOffset: prevBlock.content.length,
  });
}

function handleArrowRight(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  const position = dom.getCaretPositionInBlock(context.getSelection());
  if (!position) {
    return;
  }
  if (position.anchorOffset !== position.wholeText?.length) {
    return;
  }

  event.preventDefault();
  const nextBlock = context.block.getNextBlock();
  if (!nextBlock) {
    return;
  }

  context.setCaretPosition({ blockId: nextBlock.id, caretOffset: 0 });
}

type UseBlockKeydownHandlerArgs = {
  block: BlockEntity;
  contentRef: RefObject<HTMLElement | null>;
  splitBlockAtCaret: SplitBlockAtCaret;
  setCaretPosition: (updateFn: UpdateCaretPosition) => void;
  updateBlockById: UpdateBlockById;
  getSelection?: () => Selection | null;
};

type SplitBlockAtCaret = (
  blockId: string,
  beforeText: string,
  afterText: string,
) => BlockEntity;

type UpdateBlockById = (blockId: string, block: BlockEntity) => void;

type KeydownHandlerContext = UseBlockKeydownHandlerArgs & {
  currentElement: HTMLElement | null;
  getSelection: () => Selection | null;
};
