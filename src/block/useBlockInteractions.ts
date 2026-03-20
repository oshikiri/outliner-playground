import type {
  KeyboardEventHandler,
  MouseEventHandler,
  RefObject,
  TargetedMouseEvent,
} from "preact";
import { useCallback, useEffect, useRef } from "preact/hooks";

import type { CaretPosition } from "../state";
import { useRootBlock, useCaretPosition } from "../state";
import BlockEntity, { createBlock } from "./BlockEntity";
import { useBlockKeydownHandler } from "./BlockKeydownHandlerFactory";
import * as dom from "./dom";

type UseBlockInteractionsResult = {
  contentRef: RefObject<HTMLDivElement>;
  isEditing: boolean;
  onBlur: () => void;
  onClick: MouseEventHandler<HTMLDivElement>;
  onKeyDown: KeyboardEventHandler<HTMLDivElement>;
};

export function useBlockInteractions(
  block: BlockEntity,
): UseBlockInteractionsResult {
  const [, setRootBlock] = useRootBlock();
  const [caretPosition, setCaretPosition] = useCaretPosition();
  const contentRef = useRef<HTMLDivElement>(null);

  const splitBlockAtCaret = useCallback(
    (id: string, beforeCursor: string, afterCursor: string) => {
      let newBlock: BlockEntity | null = null;

      setRootBlock((prev) => {
        const currentBlock = prev.findBlockById(id);
        if (!currentBlock) {
          throw new Error(`Block with id ${id} was not found`);
        }

        newBlock = currentBlock.appendNewByNewline(beforeCursor, afterCursor);
        if (!newBlock) {
          throw new Error(
            `Failed to append new block by splitting block with id ${id}`,
          );
        }

        return createBlock(prev);
      });

      if (!newBlock) {
        throw new Error(`Failed to resolve new block for block with id ${id}`);
      }

      return newBlock;
    },
    [setRootBlock],
  );

  const updateBlockById = useCallback(
    (id: string, updatedBlock: BlockEntity) => {
      setRootBlock((prev) => prev.updateBlockById(id, updatedBlock));
    },
    [setRootBlock],
  );

  const isEditing = block.id === caretPosition?.blockId;

  useEffect(() => {
    if (isEditing && contentRef.current) {
      focusContentAtCaret(contentRef.current, caretPosition.caretOffset);
    }
  }, [caretPosition, isEditing]);

  const onBlur = useCallback((): void => {
    const currentElement = contentRef.current;
    if (!currentElement) {
      // [P2] blur時にDOMが外れていると caretPosition をクリアできず、編集モードが残留する。
      return;
    }

    const updated = cloneBlockWithContent(
      block,
      currentElement.innerText ?? "",
    );
    updateBlockById(block.id, updated);

    window.requestAnimationFrame(() => {
      if (document.activeElement === contentRef.current) {
        return;
      }
      setCaretPosition((prev) => {
        return clearCaretPositionForBlock(prev, block.id);
      });
    });
  }, [block, setCaretPosition, updateBlockById]);

  const onClick: MouseEventHandler<HTMLDivElement> = useCallback(
    (event: TargetedMouseEvent<HTMLDivElement>) => {
      const caretOffset = dom.getNearestCaretOffset(
        document,
        event.clientX,
        event.clientY,
      );
      setCaretPosition({
        blockId: block.id,
        caretOffset: caretOffset ?? 0,
      });
      event.stopPropagation();
    },
    [block.id, setCaretPosition],
  );

  const onKeyDown = useBlockKeydownHandler({
    block,
    contentRef,
    splitBlockAtCaret,
    setCaretPosition,
    updateBlockById,
  });

  return {
    contentRef,
    isEditing,
    onBlur,
    onClick,
    onKeyDown,
  };
}

function focusContentAtCaret(
  element: HTMLDivElement,
  caretOffset: number,
): void {
  element.focus();

  const offset = dom.clampOffsetToTextLength(element, caretOffset);
  dom.setCaretOffset(element, offset, window.getSelection());
}

function cloneBlockWithContent(
  block: BlockEntity,
  content: string,
): BlockEntity {
  const updated = createBlock(block);
  updated.content = content;
  return updated;
}

function clearCaretPositionForBlock(
  caretPosition: CaretPosition,
  blockId: string,
): CaretPosition {
  return caretPosition?.blockId === blockId ? null : caretPosition;
}
