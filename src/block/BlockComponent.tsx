import { useRef, useEffect, JSX, MouseEventHandler } from "react";

import { useStore } from "../state";
import BlockEntity from "./BlockEntity";
import * as dom from "../dom";
import { BlockKeydownHandlerFactory } from "./BlockKeydownHandlerFactory";

export default function BlockComponent({
  block,
}: {
  block: BlockEntity;
}): JSX.Element {
  const caretPosition = useStore((state: any) => state.caretPosition);
  const setCaretPosition = useStore((state: any) => state.setCaretPosition);
  const createNextBlock = useStore((state: any) => state.createNextBlock);
  const updateBlockById = useStore((state: any) => state.updateBlockById);

  const contentRef = useRef<HTMLDivElement>(null);

  const isEditing = block.id === caretPosition?.blockId;
  useEffect(() => {
    if (isEditing && contentRef.current) {
      // [P2] @owner: DOM 反映後にキャレットを合わせるため rAF/queueMicrotask を使うと安定する。
      contentRef.current.focus();

      const offset = dom.getOffset(
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
    createNextBlock,
    setCaretPosition,
    updateBlockById,
  );

  const onClick: MouseEventHandler = (event) => {
    const caretOffset = dom.getNearestCaretOffset(event.clientX, event.clientY);
    // [P2] @owner: startOffset が undefined の場合に 0 へフォールバックするガードを追加。
    setCaretPosition(block.id, caretOffset);
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
          // [P2] @owner: onPaste でプレーンテキスト化し HTML 混入を防止すること。
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
