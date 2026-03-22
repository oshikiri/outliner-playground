import type { JSX, MouseEventHandler } from "preact";
import { useCallback } from "preact/hooks";

import BlockEntity from "./BlockEntity";
import ActiveBlockEditor from "./ActiveBlockEditor";
import {
  createEditorSession,
  commitEditorSessionToRoot,
} from "./editorSession";
import * as caretDom from "./editor/caretDom";
import MarkdownComponent from "../markdown/MarkdownComponent";
import { useEditorSession, useRootBlock } from "../state";

export default function BlockComponent({
  block,
}: {
  block: BlockEntity;
}): JSX.Element {
  const [, setRootBlock] = useRootBlock();
  const [editorSession, setEditorSession] = useEditorSession();
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

      setRootBlock((prev) => commitEditorSessionToRoot(prev, editorSession));
      setEditorSession(createEditorSession(block, caretOffset));
    },
    [block, editorSession, isEditing, setEditorSession, setRootBlock],
  );

  return (
    <div className="flex">
      <div aria-hidden={true}>・</div>
      <div className="flex-grow">
        {isEditing ? (
          <ActiveBlockEditor block={block} />
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
          {block.children.map((child) => (
            <BlockComponent key={child.id} block={child} />
          ))}
        </div>
      </div>
    </div>
  );
}
