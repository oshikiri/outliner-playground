import type { JSX, MouseEventHandler } from "preact";
import { useCallback } from "preact/hooks";

import ActiveBlockEditor from "./ActiveBlockEditor";
import { getBlock, getChildBlocks, updateBlockContent } from "./blockStore";
import { createEditorSession } from "./editorSession";
import * as caretDom from "./editor/caretDom";
import MarkdownComponent from "../markdown/MarkdownComponent";
import { useEditorSession, useRootBlock } from "../state";

export default function BlockComponent({
  blockId,
}: {
  blockId: string;
}): JSX.Element {
  const [rootBlock, setRootBlock] = useRootBlock();
  const [editorSession, setEditorSession] = useEditorSession();
  const block = getBlock(rootBlock, blockId);
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

      setRootBlock((prev) => {
        if (!editorSession) {
          return prev;
        }

        return updateBlockContent(
          prev,
          editorSession.activeBlockId,
          editorSession.draftText,
        );
      });
      setEditorSession(createEditorSession(block, caretOffset));
    },
    [block, editorSession, isEditing, setEditorSession, setRootBlock],
  );

  return (
    <div className="flex">
      <div aria-hidden={true}>・</div>
      <div className="flex-grow">
        {isEditing ? (
          <ActiveBlockEditor blockId={block.id} />
        ) : (
          <div
            // Set px-1 for visibility when the cursor is at the beginning of the line.
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
          {getChildBlocks(rootBlock, block.id).map((child) => (
            <BlockComponent key={child.id} blockId={child.id} />
          ))}
        </div>
      </div>
    </div>
  );
}
