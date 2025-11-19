import { useRef, useEffect, JSX, MouseEventHandler } from "react";

import { useRootBlock, useCaretPosition } from "../state";
import BlockEntity, { createBlock } from "./BlockEntity";
import * as dom from "./dom";
import { BlockKeydownHandlerFactory } from "./BlockKeydownHandlerFactory";
import MarkdownComponent from "../markdown/MarkdownComponent";

export default function BlockComponent({
  block,
}: {
  block: BlockEntity;
}): JSX.Element {
  // @owner [P1] このコンポーネントはpropsで受け取ったBlockEntityをそのままmutateしておりReactとJotaiの不変データ原則を満たしていません
  const [rootBlock, setRootBlock] = useRootBlock();
  const [caretPosition, setCaretPosition] = useCaretPosition();

  const splitBlockAtCaret = (
    id: string,
    beforeCursor: string,
    afterCursor: string,
  ) => {
    // @owner [P1] useCallbackを使わないため毎レンダー再生成され子へ渡るのでパフォーマンス懸念があります
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
    setRootBlock((prev) => prev.updateBlockById(id, block));
  };
  // @owner [P1] こちらもuseCallback化されておらず参照安定性がありません

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
  }, [caretPosition]);

  const onBlur = () => {
    setCaretPosition(null);
    // @owner [P1] block.contentへ直接代入しているため不変性違反です
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
  // @owner [P1] FactoryインスタンスもuseMemo等でキャッシュしていないため毎レンダーconstructされます

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
          // @owner [P1] 単一要素にkeyを付けても意味がなくむしろ匂いです
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
          {/* @owner [P1] contentEditableへ危険な生文字列を挿入しておりXSS対策が未実装です */}
          {isEditing ? (
            block.content
          ) : (
            <MarkdownComponent raw={block.content} />
          )}
        </div>
        {/* @owner [P1] 下段でも単一要素にkeyを付けています */}
        <div className="ml-5" key={block.id + "-children"}>
          {block.children?.map((child) => (
            <BlockComponent key={child.id} block={child} />
          ))}
        </div>
      </div>
    </div>
  );
}
