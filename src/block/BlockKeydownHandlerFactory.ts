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
    const caretPosition = dom.getCaretPositionInBlock(context.getSelection());
    goToLineStart(event, context, caretPosition);
  } else if (event.key === "e" && event.ctrlKey) {
    const caretPosition = dom.getCaretPositionInBlock(context.getSelection());
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
    context.getSelection(),
  );
  const newBlock = context.splitBlockAtCaret(
    context.block.id,
    beforeText ?? "",
    afterText ?? "",
  );
  if (context.currentElement) {
    context.currentElement.innerText = beforeText ?? "";
  }
  setCaretPositionForBlock(context, newBlock.id, 0);
}

function handleTab(event: KeydownEvent, context: KeydownHandlerContext): void {
  event.preventDefault();

  syncCurrentBlockAndRestoreCaret(context, (updatedBlock) => {
    if (event.shiftKey) {
      const { parent, grandparent } = updatedBlock.outdent();
      updateBlocksById(context, parent, grandparent);
      return;
    }

    updateBlocksById(context, updatedBlock.indent());
  });
}

function handleArrowDown(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  if (
    !context.currentElement ||
    !dom.isCaretAtLastLine(context.block.content, context.getSelection())
  ) {
    return;
  }

  event.preventDefault();
  const nextBlock = context.block.getNextBlock();
  if (!nextBlock) {
    return;
  }

  const updatedBlock = syncCurrentBlockContent(context);

  const caretOffset = getCurrentLineOffset(context);
  const lastRange = getNewlineRangeList(updatedBlock.content).getLastRange();
  const nextCaretOffset = lastRange
    ? Math.max(0, caretOffset - lastRange.l - 1)
    : 0;
  setCaretPositionForBlock(context, nextBlock.id, nextCaretOffset);
}

function handleMoveBlockDown(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  event.preventDefault();

  syncCurrentBlockAndRestoreCaret(context, (updatedBlock) => {
    updateBlocksById(context, updatedBlock.moveDown());
  });
}

function handleArrowUp(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  if (
    !context.currentElement ||
    !dom.isCaretAtFirstLine(context.getSelection())
  ) {
    return;
  }

  event.preventDefault();
  const prevBlock = context.block.getPrevBlock();
  if (!isVisibleBlock(prevBlock)) {
    return;
  }

  syncCurrentBlockContent(context);

  const offsetAtPrev = getCurrentLineOffset(context);
  const lastRange = getNewlineRangeList(prevBlock.content).getLastRange();
  const nextCaretOffset = lastRange
    ? Math.min(lastRange.l + offsetAtPrev + 1, lastRange.r)
    : 0;
  setCaretPositionForBlock(context, prevBlock.id, nextCaretOffset);
}

function handleMoveBlockUp(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  event.preventDefault();

  syncCurrentBlockAndRestoreCaret(context, (updatedBlock) => {
    updateBlocksById(context, updatedBlock.moveUp());
  });
}

function syncCurrentBlockContent(context: KeydownHandlerContext): BlockEntity {
  const updatedBlock = createBlock(context.block);
  updatedBlock.content = context.currentElement?.innerText ?? "";
  context.updateBlockById(updatedBlock.id, updatedBlock);
  return updatedBlock;
}

function syncCurrentBlockAndRestoreCaret(
  context: KeydownHandlerContext,
  updateTree: (updatedBlock: BlockEntity) => void,
): void {
  const updatedBlock = syncCurrentBlockContent(context);
  updateTree(updatedBlock);
  setCaretPositionForBlock(
    context,
    updatedBlock.id,
    getCurrentCaretOffset(context),
  );
}

function updateBlocksById(
  context: KeydownHandlerContext,
  ...blocks: (BlockEntity | null)[]
): void {
  for (const block of blocks) {
    if (!block) {
      continue;
    }
    context.updateBlockById(block.id, block);
  }
}

function getCurrentCaretOffset(context: KeydownHandlerContext): number {
  return dom.getTextSegmentsAroundCaret(context.getSelection()).caretOffset;
}

function getCurrentLineOffset(context: KeydownHandlerContext): number {
  return dom.getCurrentLineOffset(context.getSelection());
}

function setCaretPositionForBlock(
  context: KeydownHandlerContext,
  blockId: string,
  caretOffset: number,
): void {
  context.setCaretPosition({ blockId, caretOffset });
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
    setCaretPositionForBlock(context, context.block.id, newlineIndex + 1);
  } else {
    setCaretPositionForBlock(context, context.block.id, 0);
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
    setCaretPositionForBlock(context, context.block.id, newlineIndex);
  } else {
    setCaretPositionForBlock(
      context,
      context.block.id,
      context.currentElement?.innerText.length ?? 0,
    );
  }
}

function handleBackspace(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  const currentContent = context.currentElement?.innerText ?? "";

  if (
    context.block.children.length > 0 ||
    !dom.caretIsAtBlockStart(context.getSelection())
  ) {
    return;
  }

  const prevBlock = context.block.getPrevBlock();
  if (!isVisibleBlock(prevBlock)) {
    return;
  }

  event.preventDefault();

  const prevContentLength = prevBlock.content.length;
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

  setCaretPositionForBlock(context, prevBlock.id, prevContentLength);
}

function handleArrowLeft(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  if (!dom.caretIsAtBlockStart(context.getSelection())) {
    return;
  }

  event.preventDefault();
  const prevBlock = context.block.getPrevBlock();
  if (!isVisibleBlock(prevBlock)) {
    return;
  }

  setCaretPositionForBlock(context, prevBlock.id, prevBlock.content.length);
}

function handleArrowRight(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  const position = dom.getCaretPositionInBlock(context.getSelection());
  if (!position) {
    return;
  }
  if (position.anchorOffset !== position.wholeText.length) {
    return;
  }

  event.preventDefault();
  const nextBlock = context.block.getNextBlock();
  if (!nextBlock) {
    return;
  }

  setCaretPositionForBlock(context, nextBlock.id, 0);
}

function isVisibleBlock(block: BlockEntity | null): block is BlockEntity {
  return block !== null && block.parent !== null;
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
