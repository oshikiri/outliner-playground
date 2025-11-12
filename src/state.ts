import { atom, useAtom } from "jotai";

import BlockEntity, { createBlock } from "./block/BlockEntity";
import { initialRootBlock } from "./block/data";

export type CaretPosition = {
  blockId: string;
  caretOffset: number;
} | null;

// @owner get initial value from localStorage
const rootBlockAtom = atom<BlockEntity>(initialRootBlock);
const caretPositionAtom = atom<CaretPosition>(null);

export function useRootBlock(): [BlockEntity, (block: BlockEntity) => void] {
  return useAtom(rootBlockAtom);
}

export function useCaretPosition(): [
  CaretPosition,
  (position: CaretPosition) => void,
] {
  return useAtom(caretPositionAtom);
}

export function useUpdateBlockById(): (id: string, block: BlockEntity) => void {
  const [, setRootBlock] = useAtom(rootBlockAtom);
  return (id, block) => {
    setRootBlock((root) => root.updateBlockById(id, block));
  };
}

export function useSplitBlockAtCaret(): (
  id: string,
  beforeCursor: string,
  afterCursor: string,
) => BlockEntity {
  const [rootBlock, setRootBlock] = useAtom(rootBlockAtom);
  return (id, beforeCursor, afterCursor) => {
    const block = rootBlock.findBlockById(id);
    if (!block) {
      throw new Error(`Block with id ${id} was not found`);
    }

    const {newBlock} = splitBlockAtCaret(block, beforeCursor, afterCursor);
    setRootBlock(createBlock(rootBlock));

    return newBlock;
  };
}

function splitBlockAtCaret(
  block: BlockEntity,
  beforeCaretText: string,
  afterCaretText: string,
) {
  console.log("splitBlockAtCaret", { beforeCaretText, afterCaretText });
  block.content = beforeCaretText;

  // 1. If the block has children, insert the new block as the first child.
  if (block.children.length > 0) {
    const newBlock = new BlockEntity(afterCaretText, []).withParent(block);
    block.children.splice(0, 0, newBlock);
    return { block, newBlock };
  }

  // 2. Otherwise, insert the new block as the next sibling.
  const newBlock = new BlockEntity(afterCaretText, []).withParent(block.parent);
  const [_parent, idx] = block.getParentAndIndex();
  block.parent?.children.splice(idx + 1, 0, newBlock);
  return { block, newBlock };
}
