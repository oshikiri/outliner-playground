import { useRef, useEffect, JSX, MouseEventHandler } from "react";

import { useStore } from "../state";
import BlockEntity from "./BlockEntity";
import * as dom from "../dom";
import { KeyDownEventHandlerGenerator } from "./keyboardevent";

export default function BlockComponent({
  block,
}: {
  block: BlockEntity;
}): JSX.Element {
  const cursorPosition = useStore((state: any) => state.cursorPosition);
  const setCursorPosition = useStore((state: any) => state.setCursorPosition);
  const createNextBlock = useStore((state: any) => state.createNextBlock);
  const setBlockById = useStore((state: any) => state.setBlockById);

  const contentRef = useRef<HTMLDivElement>(null);

  const isEditing = block.id === cursorPosition?.blockId;
  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus();

      const offset = dom.getOffset(
        contentRef.current,
        cursorPosition.startOffset,
      );
      const textNode = contentRef.current.childNodes[0] as HTMLElement;
      if (textNode) {
        dom.setCursor(textNode, offset);
      }
    }
  }, [cursorPosition]);

  const onBlur = () => {
    setCursorPosition(null);
    block.content = contentRef.current?.innerText || "";
    setBlockById(block.id, block);
  };

  const keyDownHandlerGenerator = new KeyDownEventHandlerGenerator(
    block,
    contentRef,
    dom.getTextsAroundCursor,
    createNextBlock,
    setCursorPosition,
    setBlockById,
  );

  const onClick: MouseEventHandler = (event) => {
    const startOffset = dom.getNearestCursorOffset(
      event.clientX,
      event.clientY,
    );
    setCursorPosition(block.id, startOffset);
    event.stopPropagation();
    return;
  };

  return (
    <div key={block.id} className="flex">
      <div>・</div>
      <div className="flex-grow">
        <div
          // Set px-1 for visibility when the cursor is at the beginning of the line.
          className="
            whitespace-pre-wrap break-all px-1
            empty:after:content-['\00a0']
          "
          key={block.id + "-content"}
          ref={contentRef}
          contentEditable={isEditing || undefined}
          suppressContentEditableWarning={isEditing || undefined}
          onClick={onClick}
          onBlur={onBlur}
          onKeyDown={keyDownHandlerGenerator.generate()}
        >
          {block.content}
        </div>
        <div className="ml-5" key={block.id + "-children"}>
          {block.children?.map((child) => (
            <BlockComponent key={child.id} block={child} />
          ))}
        </div>
      </div>
    </div>
  );
}
