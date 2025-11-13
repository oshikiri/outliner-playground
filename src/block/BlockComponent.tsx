import { useRef, useEffect, JSX, MouseEventHandler } from "react";

import { useRootBlock, useCaretPosition } from "../state";
import BlockEntity, { createBlock } from "./BlockEntity";
import * as dom from "../dom";
import { BlockKeydownHandlerFactory } from "./BlockKeydownHandlerFactory";

export default function BlockComponent({
  block,
}: {
  block: BlockEntity;
}): JSX.Element {
  const [rootBlock, setRootBlock] = useRootBlock();
  const [caretPosition, setCaretPosition] = useCaretPosition();

  const splitBlockAtCaret = (
    id: string,
    beforeCursor: string,
    afterCursor: string,
  ) => {
    const block = rootBlock.findBlockById(id);
    if (!block) {
      throw new Error(`Block with id ${id} was not found`);
    }

    const newBlock = block.appendNewByNewline(beforeCursor, afterCursor);
    if (!newBlock) {
      throw new Error(
        `Failed to append new block by splitting block with id ${id}`,
      );
    }

    setRootBlock(createBlock(rootBlock));

    return newBlock;
  };
  const updateBlockById = (id: string, block: BlockEntity) => {
    setRootBlock(rootBlock.updateBlockById(id, block));
  };

  const contentRef = useRef<HTMLDivElement>(null);

  const isEditing = block.id === caretPosition?.blockId;
  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus();

      const offset = dom.clampOffsetToTextLength(
        contentRef.current,
        caretPosition.caretOffset,
      );
      const textNode = contentRef.current.childNodes[0] as HTMLElement;
      if (textNode) {
        dom.setCaretOffset(textNode, offset);
      }
    }
  }, [caretPosition]);

  const onBlur = () => {
    setCaretPosition(null);
    block.content = contentRef.current?.innerText || "";
    updateBlockById(block.id, block);
  };

  const keyDownHandlerGenerator = new BlockKeydownHandlerFactory(
    block,
    contentRef,
    dom.getTextSegmentsAroundCaret,
    splitBlockAtCaret,
    setCaretPosition,
    updateBlockById,
  );

  const onClick: MouseEventHandler = (event) => {
    const caretOffset = dom.getNearestCaretOffset(event.clientX, event.clientY);
    setCaretPosition({
      blockId: block.id,
      caretOffset: caretOffset ?? 0,
    });
    event.stopPropagation();
    return;
  };

  return (
    <div key={block.id} className="flex">
      <div aria-hidden={true}>・</div>
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
          role="textbox"
          aria-multiline={true}
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
