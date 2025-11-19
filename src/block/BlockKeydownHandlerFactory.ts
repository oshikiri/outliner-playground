import {
  KeyboardEvent,
  useCallback,
  KeyboardEventHandler,
  RefObject,
} from "react";

import BlockEntity from "./BlockEntity";
import * as dom from "./dom";
import { getNewlineRangeList } from "../Range";
import type { UpdateCaretPosition } from "../state";

export function useBlockKeydownHandler({
  block,
  contentRef,
  splitBlockAtCaret,
  setCaretPosition,
  updateBlockById,
}: UseBlockKeydownHandlerArgs): KeyboardEventHandler {
  return useCallback(
    (event: KeyboardEvent) => {
      const currentElement = contentRef.current;
      const context: KeydownHandlerContext = {
        block,
        contentRef,
        splitBlockAtCaret,
        setCaretPosition,
        updateBlockById,
        currentElement,
      };

      if (event.key === "Enter" && !event.shiftKey) {
        handleEnter(event, context);
      } else if (event.key === "Tab") {
        handleTab(event, context);
      } else if (event.key === "ArrowDown") {
        handleArrowDown(event, context);
      } else if (event.key === "ArrowUp") {
        handleArrowUp(event, context);
      } else if (event.key === "ArrowLeft") {
        handleArrowLeft(event, context);
      } else if (event.key === "ArrowRight") {
        handleArrowRight(event, context);
      } else if (event.key === "a" && event.ctrlKey) {
        goToLineStart(event, context);
      } else if (event.key === "e" && event.ctrlKey) {
        goToLineEnd(event, context);
      } else if (event.key === "Backspace") {
        handleBackspace(event, context);
      }
    },
    [block, contentRef, splitBlockAtCaret, setCaretPosition, updateBlockById],
  );
}

function handleEnter(event: KeyboardEvent, context: KeydownHandlerContext) {
  event.preventDefault();
  const { beforeText, afterText } = dom.getTextSegmentsAroundCaret(
    window.getSelection(),
  );
  const newBlock = context.splitBlockAtCaret(
    context.block.id,
    beforeText || "",
    afterText || "",
  );
  context.setCaretPosition({ blockId: newBlock.id, caretOffset: 0 });
}

function handleTab(event: KeyboardEvent, context: KeydownHandlerContext) {
  event.preventDefault();

  // @owner [P1] BlockEntityを直接ミューテート
  context.block.content = context.currentElement?.innerText || "";
  context.updateBlockById(context.block.id, context.block);

  if (event.shiftKey) {
    const { parent, grandparent } = context.block.outdent();
    if (parent) {
      context.updateBlockById(parent.id, parent);
    }
    if (grandparent) {
      context.updateBlockById(grandparent.id, grandparent);
    }
  } else {
    const parent = context.block.indent();
    if (parent) {
      context.updateBlockById(parent.id, parent);
    }
  }

  const { caretOffset } = dom.getTextSegmentsAroundCaret(window.getSelection());
  context.setCaretPosition({ blockId: context.block.id, caretOffset });
}

function handleArrowDown(event: KeyboardEvent, context: KeydownHandlerContext) {
  if (
    !context.currentElement ||
    !dom.isCaretAtLastLine(context.block.content, window.getSelection())
  ) {
    return;
  }

  event.preventDefault();
  const nextBlock = context.block.getNextBlock();
  if (!nextBlock) {
    return;
  }

  // @owner [P1] ミューテーション
  context.block.content = context.currentElement?.innerText || "";
  context.updateBlockById(context.block.id, context.block);

  const caretOffset = dom.getCurrentLineOffset(
    context.currentElement,
    window.getSelection(),
  );
  const lastRange = getNewlineRangeList(context.block.content).getLastRange();
  const nextCaretOffset = lastRange
    ? Math.max(0, caretOffset - lastRange.l - 1)
    : 0;
  context.setCaretPosition({
    blockId: nextBlock.id,
    caretOffset: nextCaretOffset,
  });
}

function handleArrowUp(event: KeyboardEvent, context: KeydownHandlerContext) {
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

  // @owner [P1] ミューテーション
  context.block.content = context.currentElement?.innerText || "";
  context.updateBlockById(context.block.id, context.block);

  const offsetAtPrev = dom.getCurrentLineOffset(
    context.currentElement,
    window.getSelection(),
  );
  const lastRange = getNewlineRangeList(prevBlock.content).getLastRange();
  const nextCaretOffset = lastRange
    ? Math.min(lastRange.l + offsetAtPrev + 1, lastRange.r)
    : 0;
  context.setCaretPosition({
    blockId: prevBlock.id,
    caretOffset: nextCaretOffset,
  });
}

function goToLineStart(event: KeyboardEvent, context: KeydownHandlerContext) {
  event.preventDefault();

  // @owner [P1] window APIへ強依存しSSR/テストで扱いにくい
  const pos = dom.getCaretPositionInBlock(window.getSelection());
  const newlineBeforeCaret = pos?.newlines?.findLast((newline: any) => {
    return newline.index < pos.anchorOffset;
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

function goToLineEnd(event: KeyboardEvent, context: KeydownHandlerContext) {
  event.preventDefault();

  // @owner [P1] window依存
  const pos = dom.getCaretPositionInBlock(window.getSelection());
  const newlineAfterCaret = pos?.newlines?.find((newline: any) => {
    return newline.index >= pos.anchorOffset;
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

function handleBackspace(event: KeyboardEvent, context: KeydownHandlerContext) {
  // @owner [P1] ミューテーション
  context.block.content = context.currentElement?.innerText || "";

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
  const prevContentLength = prevBlock.content.length;
  // @owner [P1] ここでも破壊的変更
  prevBlock.content += context.block.content;
  const [parent, idx] = context.block.getParentAndIndex();
  // @owner [P1] children配列を直接splice
  parent?.children.splice(idx, 1);

  context.updateBlockById(prevBlock.id, prevBlock);
  if (parent) {
    context.updateBlockById(parent.id, parent);
  }

  context.setCaretPosition({
    blockId: prevBlock.id,
    caretOffset: prevContentLength,
  });
}

function handleArrowLeft(event: KeyboardEvent, context: KeydownHandlerContext) {
  if (!dom.caretIsAtBlockStart(window.getSelection())) {
    return;
  }

  event.preventDefault();
  const prevBlock = context.block.getPrevBlock();
  if (!prevBlock) {
    return;
  }

  context.setCaretPosition({
    blockId: prevBlock.id,
    caretOffset: prevBlock.content.length,
  });
}

function handleArrowRight(
  event: KeyboardEvent,
  context: KeydownHandlerContext,
) {
  // @owner [P1] window依存
  const position = dom.getCaretPositionInBlock(window.getSelection());
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
};

type SplitBlockAtCaret = (
  blockId: string,
  beforeText: string,
  afterText: string,
) => BlockEntity;

type UpdateBlockById = (blockId: string, block: BlockEntity) => void;

type KeydownHandlerContext = UseBlockKeydownHandlerArgs & {
  currentElement: HTMLElement | null;
};
