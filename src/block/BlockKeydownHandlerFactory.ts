import { useCallback, RefObject } from "preact/compat";
import type { KeyboardEventHandler, TargetedKeyboardEvent } from "preact";

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
}: UseBlockKeydownHandlerArgs): KeydownHandler {
  // [P3] キー分岐と状態更新が1箇所に集中しており、変更の影響範囲が広くテストも難しいため分割したい。
  // [P3] 入力処理とモデル更新が混在しているため、コマンド層を挟むと責務が分離できる。
  return useCallback(
    (event: KeydownEvent) => {
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
        const caretPosition = dom.getCaretPositionInBlock(
          window.getSelection(),
        );
        goToLineStart(event, context, caretPosition);
      } else if (event.key === "e" && event.ctrlKey) {
        const caretPosition = dom.getCaretPositionInBlock(
          window.getSelection(),
        );
        goToLineEnd(event, context, caretPosition);
      } else if (event.key === "Backspace") {
        handleBackspace(event, context);
      }
    },
    [block, contentRef, splitBlockAtCaret, setCaretPosition, updateBlockById],
  );
}

function handleEnter(event: KeydownEvent, context: KeydownHandlerContext) {
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

function handleTab(event: KeydownEvent, context: KeydownHandlerContext) {
  event.preventDefault();

  // [P2] DOM上の最新テキストをモデルに反映してからインデント処理を行う前提。
  const updatedBlock = createBlock(context.block);
  updatedBlock.content = context.currentElement?.innerText || "";
  context.updateBlockById(updatedBlock.id, updatedBlock);

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

function handleArrowDown(event: KeydownEvent, context: KeydownHandlerContext) {
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

  const updatedBlock = createBlock(context.block);
  updatedBlock.content = context.currentElement?.innerText || "";
  context.updateBlockById(updatedBlock.id, updatedBlock);

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

function handleArrowUp(event: KeydownEvent, context: KeydownHandlerContext) {
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

  const updatedBlock = createBlock(context.block);
  updatedBlock.content = context.currentElement?.innerText || "";
  context.updateBlockById(updatedBlock.id, updatedBlock);

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

function goToLineStart(
  event: KeydownEvent,
  context: KeydownHandlerContext,
  caretPosition: CaretPosition,
) {
  event.preventDefault();

  const newlineBeforeCaret = caretPosition?.newlines?.findLast(
    (newline: any) => {
      return newline.index < caretPosition.anchorOffset;
    },
  );
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
) {
  event.preventDefault();

  const newlineAfterCaret = caretPosition?.newlines?.find((newline: any) => {
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

function handleBackspace(event: KeydownEvent, context: KeydownHandlerContext) {
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

function handleArrowLeft(event: KeydownEvent, context: KeydownHandlerContext) {
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

function handleArrowRight(event: KeydownEvent, context: KeydownHandlerContext) {
  // [P3] window依存
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
