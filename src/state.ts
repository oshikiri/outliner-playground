import { create } from "zustand";

import BlockEntity, { createBlock } from "./block/BlockEntity";
import { initialPage } from "./block/data";

const rootBlockKey = "rootBlock";
const rootBlockFromLocalStorage =
  typeof window !== "undefined"
    ? window.localStorage.getItem(rootBlockKey)
    : null;
const rootBlock = rootBlockFromLocalStorage
  ? JSON.parse(rootBlockFromLocalStorage)
  : initialPage;

export const useStore = create((set, get: any) => ({
  rootBlock: createBlock(rootBlock),
  setRootBlock: (block: BlockEntity) => set({ rootBlock: block }),
  getBlockById: (id: string) => get().rootBlock.getBlockById(id),
  setBlockById: (id: string, block: BlockEntity) => {
    const root = createBlock(get().rootBlock);
    const updatedRoot = root.updateBlockById(id, block);
    set({ rootBlock: createBlock(updatedRoot) });
  },
  createNextBlock: (id: string, beforeCursor: string, afterCursor: string) => {
    const block = get().rootBlock.getBlockById(id);
    const { newBlock } = createNext(block, beforeCursor, afterCursor);
    get().setBlockById(newBlock.id, newBlock);
    return newBlock;
  },
  cursorPosition: null,
  setCursorPosition: (blockId: string, startOffset: number) =>
    set({ cursorPosition: { blockId, startOffset } }),
}));

export function setToLocalStorage(rootBlock: BlockEntity) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(rootBlockKey, JSON.stringify(rootBlock.toJson()));
}
export function clearLocalStorage() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(rootBlockKey);
}

function createNext(
  block: BlockEntity,
  beforeCursor: string,
  afterCursor: string,
) {
  console.log("createNext", { beforeCursor, afterCursor });
  block.content = beforeCursor;

  if (block.children.length > 0) {
    const newBlock = new BlockEntity(afterCursor, []).withParent(block);
    block.children.splice(0, 0, newBlock);
    return { block, newBlock };
  }

  const newBlock = new BlockEntity(afterCursor, []).withParent(block.parent);
  const [_parent, idx] = block.getParentAndIdx();
  block.parent?.children.splice(idx + 1, 0, newBlock);
  return { block, newBlock };
}
