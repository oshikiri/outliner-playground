import type {
  KeyboardEventHandler,
  RefObject,
  TargetedKeyboardEvent,
} from "preact";
import { useCallback } from "preact/hooks";

import type { BlockState, BlockStore } from "./blockStore";
import { findNextBlock, findPrevBlock } from "./blockStore";
import { createEditorSession, type ActiveEditorSession } from "./editorSession";
import * as caretDom from "./editor/caretDom";
import {
  useIndentBlock,
  useJoinBlockWithPreviousSibling,
  useMoveBlockDown,
  useMoveBlockUp,
  useOutdentBlock,
  useSplitBlockAtCaret,
  useUpdateBlockContent,
  type UpdateEditorSession,
} from "../state";

type CaretPosition = ReturnType<typeof caretDom.getCaretPositionInBlock>;
type KeydownEvent = TargetedKeyboardEvent<HTMLDivElement>;
type KeydownHandler = KeyboardEventHandler<HTMLDivElement>;
const IME_PROCESS_KEYCODE = 229;

export function useBlockKeydownHandler({
  block,
  rootBlock,
  contentRef,
  editorSession,
  setEditorSession,
  getSelection,
}: UseBlockKeydownHandlerArgs): KeydownHandler {
  const updateBlockContent = useUpdateBlockContent();
  const splitBlockAtCaret = useSplitBlockAtCaret();
  const indentBlock = useIndentBlock();
  const outdentBlock = useOutdentBlock();
  const moveBlockUp = useMoveBlockUp();
  const moveBlockDown = useMoveBlockDown();
  const joinBlockWithPreviousSibling = useJoinBlockWithPreviousSibling();

  return useCallback(
    (event: KeydownEvent) => {
      dispatchKeydownEvent(
        event,
        createKeydownHandlerContext({
          block,
          rootBlock,
          contentRef,
          editorSession,
          setEditorSession,
          updateBlockContent,
          splitBlockAtCaret,
          indentBlock,
          outdentBlock,
          moveBlockUp,
          moveBlockDown,
          joinBlockWithPreviousSibling,
          getSelection,
        }),
      );
    },
    [
      block,
      contentRef,
      editorSession,
      getSelection,
      indentBlock,
      joinBlockWithPreviousSibling,
      moveBlockDown,
      moveBlockUp,
      outdentBlock,
      rootBlock,
      setEditorSession,
      splitBlockAtCaret,
      updateBlockContent,
    ],
  );
}

function createKeydownHandlerContext(
  args: UseBlockKeydownHandlerArgs & KeydownHandlerActions,
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
  if (isImeComposing(event)) {
    return;
  }

  if (shouldInsertPageReference(event)) {
    handleInsertPageReference(event, context);
  } else if (event.key === "Enter" && !event.shiftKey) {
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
    const caretPosition = caretDom.getCaretPositionInBlock(
      context.getSelection(),
    );
    goToLineStart(event, context, caretPosition);
  } else if (event.key === "e" && event.ctrlKey) {
    const caretPosition = caretDom.getCaretPositionInBlock(
      context.getSelection(),
    );
    goToLineEnd(event, context, caretPosition);
  } else if (event.key === "Backspace") {
    handleBackspace(event, context);
  }
}

function isImeComposing(event: KeydownEvent): boolean {
  if (event.isComposing || event.key === "Process") {
    return true;
  }

  // Some browsers still expose ongoing IME composition via legacy keyCode/which
  // 229 even when `key` alone is not enough to distinguish it.
  const keyboardEvent = event as KeydownEvent & {
    keyCode?: number;
    which?: number;
  };
  return (
    keyboardEvent.keyCode === IME_PROCESS_KEYCODE ||
    keyboardEvent.which === IME_PROCESS_KEYCODE
  );
}

function shouldInsertPageReference(event: KeydownEvent): boolean {
  const keyboardEvent = event as KeydownEvent & {
    code?: string;
  };

  return (
    event.ctrlKey && (event.key === "[" || keyboardEvent.code === "BracketLeft")
  );
}

function handleInsertPageReference(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  event.preventDefault();

  const { beforeText, afterText, caretOffset } =
    caretDom.getTextSegmentsAroundCaret(context.getSelection());
  const pageReference = "[[]]";
  const nextDraftText = `${beforeText}${pageReference}${afterText}`;
  const nextCaretOffset = caretOffset + 2;

  if (context.currentElement) {
    context.currentElement.textContent = nextDraftText;
  }

  context.setEditorSession({
    activeBlockId: context.block.id,
    draftText: nextDraftText,
    caretOffset: nextCaretOffset,
  });
}

function handleEnter(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  event.preventDefault();
  const { beforeText, afterText } = caretDom.getTextSegmentsAroundCaret(
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
  setEditorSessionForBlock(context, newBlock, 0);
}

function handleTab(event: KeydownEvent, context: KeydownHandlerContext): void {
  event.preventDefault();

  const updatedBlock = getUpdatedBlock(context);

  if (event.shiftKey) {
    context.outdentBlock(updatedBlock.id, updatedBlock.content);
  } else {
    context.indentBlock(updatedBlock.id, updatedBlock.content);
  }

  setEditorSessionForBlock(
    context,
    updatedBlock,
    getCurrentCaretOffset(context),
  );
}

function handleArrowDown(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  const currentContent = context.currentElement?.innerText ?? "";
  if (
    !context.currentElement ||
    !caretDom.isCaretAtLastLine(currentContent, context.getSelection())
  ) {
    return;
  }

  event.preventDefault();
  const nextBlock = findNextBlock(context.rootBlock, context.block.id);
  if (!nextBlock) {
    return;
  }

  const updatedBlock = syncCurrentBlockContent(context);

  const caretOffset = getCurrentLineOffset(context);
  const currentLineStart = getLineStartOffset(
    updatedBlock.content,
    caretOffset,
  );
  const offsetInLine = Math.max(0, caretOffset - currentLineStart);
  const nextFirstLineLength = getFirstLineLength(nextBlock.content);
  const nextCaretOffset = Math.min(offsetInLine, nextFirstLineLength);
  setEditorSessionForBlock(context, nextBlock, nextCaretOffset);
}

function handleMoveBlockDown(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  event.preventDefault();

  const updatedBlock = getUpdatedBlock(context);
  context.moveBlockDown(updatedBlock.id, updatedBlock.content);
  setEditorSessionForBlock(
    context,
    updatedBlock,
    getCurrentCaretOffset(context),
  );
}

function handleArrowUp(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  if (
    !context.currentElement ||
    !caretDom.isCaretAtFirstLine(context.getSelection())
  ) {
    return;
  }

  event.preventDefault();
  const prevBlock = findPrevBlock(context.rootBlock, context.block.id);
  if (!isVisibleBlock(prevBlock)) {
    return;
  }

  const updatedBlock = syncCurrentBlockContent(context);

  const caretOffset = getCurrentLineOffset(context);
  const currentLineStart = getLineStartOffset(
    updatedBlock.content,
    caretOffset,
  );
  const offsetInLine = Math.max(0, caretOffset - currentLineStart);
  const prevLastLineStart = getLastLineStartOffset(prevBlock.content);
  const nextCaretOffset = Math.min(
    prevLastLineStart + offsetInLine,
    prevBlock.content.length,
  );
  setEditorSessionForBlock(context, prevBlock, nextCaretOffset);
}

function handleMoveBlockUp(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  event.preventDefault();

  const updatedBlock = getUpdatedBlock(context);
  context.moveBlockUp(updatedBlock.id, updatedBlock.content);
  setEditorSessionForBlock(
    context,
    updatedBlock,
    getCurrentCaretOffset(context),
  );
}

function syncCurrentBlockContent(context: KeydownHandlerContext): BlockState {
  const updatedBlock = getUpdatedBlock(context);
  context.updateBlockContent(updatedBlock.id, updatedBlock.content);
  return updatedBlock;
}

function getUpdatedBlock(context: KeydownHandlerContext): BlockState {
  return {
    ...context.block,
    content: context.currentElement?.innerText ?? "",
  };
}

function getCurrentCaretOffset(context: KeydownHandlerContext): number {
  return caretDom.getTextSegmentsAroundCaret(context.getSelection())
    .caretOffset;
}

function getCurrentLineOffset(context: KeydownHandlerContext): number {
  return caretDom.getCurrentLineOffset(context.getSelection());
}

function getLineStartOffset(content: string, caretOffset: number): number {
  if (caretOffset <= 0) {
    return 0;
  }

  const previousNewline = content.lastIndexOf("\n", caretOffset - 1);
  return previousNewline + 1;
}

function getLastLineStartOffset(content: string): number {
  return content.lastIndexOf("\n") + 1;
}

function getFirstLineLength(content: string): number {
  const firstNewline = content.indexOf("\n");
  if (firstNewline === -1) {
    return content.length;
  }
  return firstNewline;
}

function setEditorSessionForBlock(
  context: KeydownHandlerContext,
  block: Pick<BlockState, "id" | "content">,
  caretOffset: number,
): void {
  context.setEditorSession(createEditorSession(block, caretOffset));
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
    setEditorSessionForBlock(context, context.block, newlineIndex + 1);
  } else {
    setEditorSessionForBlock(context, context.block, 0);
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
    setEditorSessionForBlock(context, context.block, newlineIndex);
  } else {
    setEditorSessionForBlock(
      context,
      context.block,
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
    context.block.childrenIds.length > 0 ||
    !caretDom.caretIsAtBlockStart(context.getSelection())
  ) {
    return;
  }

  const previousBlock = findPrevBlock(context.rootBlock, context.block.id);
  if (!isVisibleBlock(previousBlock)) {
    return;
  }

  event.preventDefault();

  const merged = context.joinBlockWithPreviousSibling(
    context.block.id,
    currentContent,
  );
  if (!merged) {
    return;
  }

  setEditorSessionForBlock(context, merged.previousBlock, merged.caretOffset);
}

function handleArrowLeft(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  if (!caretDom.caretIsAtBlockStart(context.getSelection())) {
    return;
  }

  event.preventDefault();
  const prevBlock = findPrevBlock(context.rootBlock, context.block.id);
  if (!isVisibleBlock(prevBlock)) {
    return;
  }

  setEditorSessionForBlock(context, prevBlock, prevBlock.content.length);
}

function handleArrowRight(
  event: KeydownEvent,
  context: KeydownHandlerContext,
): void {
  const position = caretDom.getCaretPositionInBlock(context.getSelection());
  if (!position) {
    return;
  }
  if (position.anchorOffset !== position.wholeText.length) {
    return;
  }

  event.preventDefault();
  const nextBlock = findNextBlock(context.rootBlock, context.block.id);
  if (!nextBlock) {
    return;
  }

  setEditorSessionForBlock(context, nextBlock, 0);
}

function isVisibleBlock(block: BlockState | null): block is BlockState {
  return block !== null && block.parentId !== null;
}

type UseBlockKeydownHandlerArgs = {
  block: BlockState;
  rootBlock: BlockStore;
  contentRef: RefObject<HTMLElement | null>;
  editorSession: ActiveEditorSession;
  setEditorSession: (updateFn: UpdateEditorSession) => void;
  getSelection?: () => Selection | null;
};

type KeydownHandlerActions = {
  updateBlockContent: ReturnType<typeof useUpdateBlockContent>;
  splitBlockAtCaret: ReturnType<typeof useSplitBlockAtCaret>;
  indentBlock: ReturnType<typeof useIndentBlock>;
  outdentBlock: ReturnType<typeof useOutdentBlock>;
  moveBlockUp: ReturnType<typeof useMoveBlockUp>;
  moveBlockDown: ReturnType<typeof useMoveBlockDown>;
  joinBlockWithPreviousSibling: ReturnType<
    typeof useJoinBlockWithPreviousSibling
  >;
};

type KeydownHandlerContext = UseBlockKeydownHandlerArgs &
  KeydownHandlerActions & {
    currentElement: HTMLElement | null;
    getSelection: () => Selection | null;
  };
