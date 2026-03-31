import type { JSX, MouseEventHandler } from "preact";
import { useCallback } from "preact/hooks";

import { createEditorSession } from "../../state/editorSession";
import { useBlock, useEditorSession, useUpdateBlockContent } from "../../state";
import ActiveBlockEditor from "./ActiveBlockEditor";
import MarkdownComponent from "../markdown/MarkdownComponent";
import * as caretDom from "./caret/caretDom";

export default function BlockComponent({
  blockId,
}: {
  blockId: string;
}): JSX.Element {
  const updateBlockContent = useUpdateBlockContent();
  const [editorSession, setEditorSession] = useEditorSession();
  const block = useBlock(blockId);
  if (!block) {
    throw new Error(`Block "${blockId}" was not found.`);
  }
  const isEditing = editorSession?.activeBlockId === block.id;

  const onClick: MouseEventHandler<HTMLDivElement> = useCallback(
    (event) => {
      if (isEditing) {
        return;
      }

      const caretOffset =
        caretDom.getNearestCaretOffset(
          event.currentTarget,
          document,
          event.clientX,
          event.clientY,
        ) ?? 0;

      if (editorSession) {
        updateBlockContent(
          editorSession.activeBlockId,
          editorSession.draftText,
        );
      }
      setEditorSession(createEditorSession(block, caretOffset));
    },
    [block, editorSession, isEditing, setEditorSession, updateBlockContent],
  );

  return (
    <div className="flex">
      <div aria-hidden={true}>・</div>
      <div className="flex-grow">
        {isEditing ? (
          <ActiveBlockEditor blockId={block.id} />
        ) : (
          <div
            // Keep the display padding aligned with the editor so click-to-edit
            // enters at a visually consistent horizontal position.
            className="
              whitespace-pre-wrap break-all px-1
              empty:after:content-['\00a0']
            "
            onClick={onClick}
            role="textbox"
            aria-readonly={true}
            aria-multiline={true}
          >
            <MarkdownComponent raw={block.content} />
          </div>
        )}
        <div className="ml-5">
          {block.childrenIds.map((childId) => (
            <BlockComponent key={childId} blockId={childId} />
          ))}
        </div>
      </div>
    </div>
  );
}
