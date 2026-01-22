import { useRef, useEffect, useCallback, JSX, MouseEventHandler } from "react";

import { useRootBlock, useCaretPosition } from "../state";
import BlockEntity from "./BlockEntity";
import { createBlock } from "./BlockEntity";
import * as dom from "./dom";
import { useBlockKeydownHandler } from "./BlockKeydownHandlerFactory";
import MarkdownComponent from "../markdown/MarkdownComponent";

export default function BlockComponent({
  block,
}: {
  block: BlockEntity;
}): JSX.Element {
  const [rootBlock, setRootBlock] = useRootBlock();
  const [caretPosition, setCaretPosition] = useCaretPosition();

  const splitBlockAtCaret = useCallback(
    (id: string, beforeCursor: string, afterCursor: string) => {
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

      setRootBlock((prev) => createBlock(prev));

      return newBlock;
    },
    [rootBlock, setRootBlock],
  );
  const updateBlockById = useCallback(
    (id: string, block: BlockEntity) => {
      setRootBlock((prev) => prev.updateBlockById(id, block));
    },
    [setRootBlock],
  );

  const contentRef = useRef<HTMLDivElement>(null);

  const isEditing = block.id === caretPosition?.blockId;
  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus();

      const offset = dom.clampOffsetToTextLength(
        contentRef.current,
        caretPosition.caretOffset,
      );
      // @owner [P1] Text/HTMLElementの厳密な型判定をせずキャストしています
      const textNode = contentRef.current.childNodes[0] as HTMLElement;
      if (textNode) {
        dom.setCaretOffset(textNode, offset, window.getSelection());
      }
    }
  }, [caretPosition, isEditing]);

  const onBlur = () => {
    const currentElement = contentRef.current;
    if (!currentElement) {
      return;
    }
    setCaretPosition(null);
    const updated = createBlock(block);
    updated.content = currentElement.innerText || "";
    updateBlockById(block.id, updated);
  };

  const onKeyDown = useBlockKeydownHandler({
    block,
    contentRef,
    splitBlockAtCaret,
    setCaretPosition,
    updateBlockById,
  });

  const onClick: MouseEventHandler = (event) => {
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
          ref={contentRef}
          contentEditable={isEditing || undefined}
          suppressContentEditableWarning={isEditing || undefined}
          onClick={onClick}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          role="textbox"
          aria-multiline={true}
        >
          {/* @owner [P1] contentEditableへ危険な生文字列を挿入しておりXSS対策が未実装です */}
          {isEditing ? (
            block.content
          ) : (
            <MarkdownComponent raw={block.content} />
          )}
        </div>
        <div className="ml-5">
          {block.children?.map((child) => (
            <BlockComponent key={child.id} block={child} />
          ))}
        </div>
      </div>
    </div>
  );
}
