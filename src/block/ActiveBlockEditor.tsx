import type {
  FocusEventHandler,
  JSX,
  RefObject,
  TargetedFocusEvent,
  TargetedInputEvent,
} from "preact";
import { useCallback, useLayoutEffect, useRef } from "preact/hooks";

import { useBlockKeydownHandler } from "./BlockKeydownHandlerFactory";
import * as caretDom from "./editor/caretDom";
import {
  useBlock,
  useEditorSession,
  useRootBlockValue,
  useUpdateBlockContent,
} from "../state";

type ActiveBlockEditorProps = {
  blockId: string;
  onReady?: (contentRef: RefObject<HTMLDivElement>) => void;
};

export default function ActiveBlockEditor({
  blockId,
  onReady,
}: ActiveBlockEditorProps): JSX.Element {
  const rootBlock = useRootBlockValue();
  const updateBlockContent = useUpdateBlockContent();
  const [editorSession, setEditorSession] = useEditorSession();
  const contentRef = useRef<HTMLDivElement>(null);
  const block = useBlock(blockId);

  if (!block) {
    throw new Error(`Block "${blockId}" was not found.`);
  }

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
      updateBlockContent(block.id, draftText);

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
    [block.id, setEditorSession, updateBlockContent],
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
    rootBlock,
    contentRef,
    editorSession,
    setEditorSession,
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

  // The editor session keeps caretOffset in plain-text coordinates.
  const offset = caretDom.clampOffsetToTextLength(element, caretOffset);
  caretDom.setCaretOffset(element, offset, window.getSelection());
}

function getElementText(element: HTMLDivElement): string {
  return element.innerText ?? element.textContent ?? "";
}
