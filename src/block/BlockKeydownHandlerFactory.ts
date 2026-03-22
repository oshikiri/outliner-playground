import type {
  KeyboardEventHandler,
  RefObject,
  TargetedKeyboardEvent,
} from "preact";
import { useCallback } from "preact/hooks";

import type BlockEntity from "./BlockEntity";
import { createBlock } from "./BlockEntity";
import { createEditorSession } from "./editorSession";
import * as dom from "./dom";
import type { EditorSession, UpdateEditorSession } from "../state";

type CaretPosition = ReturnType<typeof dom.getCaretPositionInBlock>;
type KeydownEvent = TargetedKeyboardEvent<HTMLDivElement>;
type KeydownHandler = KeyboardEventHandler<HTMLDivElement>;
type ActiveEditorSession = Exclude<EditorSession, null>;

export function useBlockKeydownHandler({
  block,
  contentRef,
  editorSession,
  splitBlockAtCaret,
  setEditorSession,
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
          editorSession,
          splitBlockAtCaret,
          setEditorSession,
          updateBlockById,
          getSelection,
        }),
      );
    },
    [
      block,
      contentRef,
      editorSession,
      getSelection,
      splitBlockAtCaret,
      setEditorSession,
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
  setEditorSessionForBlock(context, newBlock, 0);
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
  // TODO: 既知課題。判定に context.block.content を使うと同期前の内容を参照する可能性がある。currentElement.innerText を同期した値で判定する。
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
  setEditorSessionForBlock(
    context,
    updatedBlock,
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
  block: BlockEntity,
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

  setEditorSessionForBlock(context, prevClone, prevContentLength);
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

  setEditorSessionForBlock(context, prevBlock, prevBlock.content.length);
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

  setEditorSessionForBlock(context, nextBlock, 0);
}

function isVisibleBlock(block: BlockEntity | null): block is BlockEntity {
  return block !== null && block.parent !== null;
}

type UseBlockKeydownHandlerArgs = {
  block: BlockEntity;
  contentRef: RefObject<HTMLElement | null>;
  editorSession: ActiveEditorSession;
  splitBlockAtCaret: SplitBlockAtCaret;
  setEditorSession: (updateFn: UpdateEditorSession) => void;
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
