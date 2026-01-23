import { useCallback, RefObject } from "preact/compat";
import type { KeyboardEventHandler, TargetedKeyboardEvent } from "preact";

import type BlockEntity from "./BlockEntity";
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

  // [P3] BlockEntityを直接ミューテート
  // [P2] DOM上の最新テキストをモデルに反映してからインデント処理を行う前提。
  context.block.content = context.currentElement?.innerText || "";
  context.updateBlockById(context.block.id, context.block);
  // [P3] ミューテーションだと過去状態も書き換わり、差分比較やUndo/Redoが難しくなる。

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

function handleArrowDown(event: KeydownEvent, context: KeydownHandlerContext) {
  // [P2] 仕様は折返し行(visual line)移動だが、実装は改行単位なので折返し内の上下移動が効かない。
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

  // [P3] ミューテーション
  context.block.content = context.currentElement?.innerText || "";
  context.updateBlockById(context.block.id, context.block);

  const caretOffset = dom.getCurrentLineOffset(window.getSelection());
  const lastRange = getNewlineRangeList(context.block.content).getLastRange();
  const nextCaretOffset = lastRange
    ? Math.max(0, caretOffset - lastRange.l - 1)
    : 0;
  context.setCaretPosition({
    blockId: nextBlock.id,
    caretOffset: nextCaretOffset,
  });
}

function handleArrowUp(event: KeydownEvent, context: KeydownHandlerContext) {
  // [P2] 仕様は折返し行(visual line)移動だが、実装は改行単位なので折返し内の上下移動が効かない。
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
  // [P1] 先頭ブロックでは prevBlock がルートになり、非表示のルートへカーソルが移動して見失う。

  // [P3] ミューテーション
  context.block.content = context.currentElement?.innerText || "";
  context.updateBlockById(context.block.id, context.block);

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
  // [P3] ミューテーション
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
  // [P1] 先頭ブロックでは prevBlock がルートになり、表示されないルートに結合されて内容が消えたように見える。

  event.preventDefault();
  const prevContentLength = prevBlock.content.length;
  // [P2] prevBlock と parent の整合性(親子関係/インデックス)が崩れていない前提で結合している。
  // [P3] ここでも破壊的変更
  prevBlock.content += context.block.content;
  const [parent, idx] = context.block.getParentAndIndex();
  // [P3] children配列を直接splice
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

function handleArrowLeft(event: KeydownEvent, context: KeydownHandlerContext) {
  if (!dom.caretIsAtBlockStart(window.getSelection())) {
    return;
  }

  event.preventDefault();
  const prevBlock = context.block.getPrevBlock();
  if (!prevBlock) {
    return;
  }
  // [P1] 先頭ブロックでは prevBlock がルートになり、非表示のルートへカーソルが移動して見失う。

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
