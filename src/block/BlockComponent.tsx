import type { JSX } from "preact";

import BlockEntity from "./BlockEntity";
import MarkdownComponent from "../markdown/MarkdownComponent";
import { useBlockInteractions } from "./useBlockInteractions";

export default function BlockComponent({
  block,
}: {
  block: BlockEntity;
}): JSX.Element {
  const { contentRef, isEditing, onBlur, onClick, onKeyDown } =
    useBlockInteractions(block);

  return (
    <div className="flex">
      <div aria-hidden={true}>・</div>
      <div className="flex-grow">
        <div
          // Set px-1 for visibility when the cursor is at the beginning of the line.
          className="
            whitespace-pre-wrap break-all px-1
            empty:after:content-['\00a0']
          "
          ref={contentRef}
          contentEditable={isEditing || undefined}
          onClick={onClick}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          role="textbox"
          aria-readonly={!isEditing}
          aria-multiline={true}
        >
          {isEditing ? (
            block.content
          ) : (
            <MarkdownComponent raw={block.content} />
          )}
        </div>
        <div className="ml-5">
          {block.children.map((child) => (
            <BlockComponent key={child.id} block={child} />
          ))}
        </div>
      </div>
    </div>
  );
}
