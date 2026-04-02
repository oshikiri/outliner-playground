import type { JSX, MouseEventHandler } from "preact";
import { useCallback } from "preact/hooks";

import { findBlock, type BlockStore } from "../../core/block/blockStore";
import { createEditorSession } from "../../state/editorSession";
import {
  useBlock,
  useEditorSession,
  useIsBlockCollapsed,
  useRootBlockValue,
  useToggleBlockCollapsed,
  useUpdateBlockContent,
} from "../../state";
import ActiveBlockEditor from "./ActiveBlockEditor";
import MarkdownComponent from "../markdown/MarkdownComponent";
import * as caretDom from "./caret/caretDom";

export default function BlockComponent({
  blockId,
}: {
  blockId: string;
}): JSX.Element {
  const updateBlockContent = useUpdateBlockContent();
  const toggleBlockCollapsed = useToggleBlockCollapsed();
  const rootBlock = useRootBlockValue();
  const [editorSession, setEditorSession] = useEditorSession();
  const block = useBlock(blockId);
  if (!block) {
    throw new Error(`Block "${blockId}" was not found.`);
  }
  const isEditing = editorSession?.activeBlockId === block.id;
  const isCollapsible = block.childrenIds.length > 0;
  const isBlockCollapsed = useIsBlockCollapsed(block.id);
  const isCollapsed = isCollapsible && isBlockCollapsed;

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

  const onToggleCollapse: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.preventDefault();

      if (
        !isCollapsed &&
        editorSession &&
        isDescendantBlock(rootBlock, editorSession.activeBlockId, block.id)
      ) {
        updateBlockContent(
          editorSession.activeBlockId,
          editorSession.draftText,
        );
        setEditorSession(null);
      }

      toggleBlockCollapsed(block.id);
    },
    [
      block.id,
      editorSession,
      isCollapsed,
      rootBlock,
      setEditorSession,
      toggleBlockCollapsed,
      updateBlockContent,
    ],
  );

  return (
    <div className="flex">
      <div className="w-5 shrink-0">
        {isCollapsible ? (
          <button
            type="button"
            aria-label={
              isCollapsed ? "子ブロックを展開" : "子ブロックを折りたたむ"
            }
            className="w-full cursor-pointer text-left"
            onClick={onToggleCollapse}
          >
            {isCollapsed ? "▸" : "▾"}
          </button>
        ) : (
          <div aria-hidden={true}>・</div>
        )}
      </div>
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
        {!isCollapsed ? (
          <div className="ml-5">
            {block.childrenIds.map((childId) => (
              <BlockComponent key={childId} blockId={childId} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function isDescendantBlock(
  rootBlock: BlockStore,
  blockId: string,
  ancestorBlockId: string,
): boolean {
  let currentBlock = findBlock(rootBlock, blockId);
  while (currentBlock && currentBlock.parentId !== null) {
    if (currentBlock.parentId === ancestorBlockId) {
      return true;
    }
    currentBlock = findBlock(rootBlock, currentBlock.parentId);
  }

  return false;
}
