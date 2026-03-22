import type {
  FocusEventHandler,
  JSX,
  RefObject,
  TargetedFocusEvent,
  TargetedInputEvent,
} from "preact";
import { useCallback, useLayoutEffect, useRef } from "preact/hooks";

import { useBlockKeydownHandler } from "./BlockKeydownHandlerFactory";
import type BlockEntity from "./BlockEntity";
import { createBlock } from "./BlockEntity";
import * as dom from "./dom";
import { useEditorSession, useRootBlock } from "../state";

type ActiveBlockEditorProps = {
  block: BlockEntity;
  onReady?: (contentRef: RefObject<HTMLDivElement>) => void;
};

export default function ActiveBlockEditor({
  block,
  onReady,
}: ActiveBlockEditorProps): JSX.Element {
  const [, setRootBlock] = useRootBlock();
  const [editorSession, setEditorSession] = useEditorSession();
  const contentRef = useRef<HTMLDivElement>(null);

  if (!editorSession || editorSession.activeBlockId !== block.id) {
    return <></>;
  }

  useLayoutEffect(() => {
    if (!contentRef.current) {
      return;
    }

    contentRef.current.textContent = editorSession.draftText;
  }, [block.id]);

  useLayoutEffect(() => {
    if (!contentRef.current) {
      return;
    }

    focusContentAtCaret(contentRef.current, editorSession.caretOffset);
  }, [block.id, editorSession.caretOffset]);

  useLayoutEffect(() => {
    if (!onReady) {
      return;
    }

    onReady(contentRef);
  }, [onReady]);

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

  const onBlur = useCallback(
    (event: TargetedFocusEvent<HTMLDivElement>): void => {
      const currentElement = contentRef.current ?? event.currentTarget;
      const draftText = getElementText(currentElement);

      setEditorSession((prev) => {
        if (!prev || prev.activeBlockId !== block.id) {
          return prev;
        }

        return {
          ...prev,
          draftText,
        };
      });
      setRootBlock((prev) => {
        const currentBlock = prev.findBlockById(block.id);
        if (!currentBlock || currentBlock.content === draftText) {
          return prev;
        }

        const updatedBlock = createBlock(currentBlock);
        updatedBlock.content = draftText;
        return prev.updateBlockById(updatedBlock.id, updatedBlock);
      });

      window.requestAnimationFrame(() => {
        if (document.activeElement === currentElement) {
          return;
        }

        setEditorSession((prev) => {
          if (prev?.activeBlockId !== block.id) {
            return prev;
          }
          return null;
        });
      });
    },
    [block.id, setEditorSession, setRootBlock],
  );

  const onInput = useCallback(
    (event: TargetedInputEvent<HTMLDivElement>): void => {
      const draftText = getElementText(event.currentTarget);

      setEditorSession((prev) => {
        if (!prev || prev.activeBlockId !== block.id) {
          return prev;
        }

        return {
          ...prev,
          draftText,
        };
      });
    },
    [block.id, setEditorSession],
  );

  const onKeyDown = useBlockKeydownHandler({
    block,
    contentRef,
    editorSession,
    splitBlockAtCaret,
    setEditorSession,
    updateBlockById,
  });

  return (
    <div
      contentEditable={true}
      className="
        whitespace-pre-wrap break-all px-1
        empty:after:content-['\00a0']
      "
      ref={contentRef}
      onBlur={onBlur as FocusEventHandler<HTMLDivElement>}
      onInput={onInput}
      onKeyDown={onKeyDown}
      role="textbox"
      aria-readonly={false}
      aria-multiline={true}
    />
  );
}

function focusContentAtCaret(
  element: HTMLDivElement,
  caretOffset: number,
): void {
  element.focus();

  const offset = dom.clampOffsetToTextLength(element, caretOffset);
  dom.setCaretOffset(element, offset, window.getSelection());
}

function getElementText(element: HTMLDivElement): string {
  return element.innerText ?? element.textContent ?? "";
}
