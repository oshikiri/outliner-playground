import { create } from "zustand";

import BlockEntity, { createBlock } from "./block/BlockEntity";
import { initialRootBlock } from "./block/data";

const rootBlockKey = "rootBlock";
const savedRootBlock =
  typeof window !== "undefined"
    ? window.localStorage.getItem(rootBlockKey)
    : null;
const rootBlockData = savedRootBlock
  ? JSON.parse(savedRootBlock)
  : initialRootBlock;

export type CaretPosition = {
  blockId: string;
  caretOffset: number;
};

type BlockStore = {
  rootBlock: BlockEntity;
  setRootBlock: (block: BlockEntity) => void;
  findBlockById: (id: string) => BlockEntity | null;
  updateBlockById: (id: string, block: BlockEntity) => void;
  splitBlockAtCaret: (
    id: string,
    beforeCursor: string,
    afterCursor: string,
  ) => BlockEntity;
  caretPosition: CaretPosition | null;
  setCaretPosition: (position: CaretPosition | null) => void;
};

export const useStore = create<BlockStore>((set, get) => ({
  rootBlock: createBlock(rootBlockData),
  setRootBlock: (block: BlockEntity) => set({ rootBlock: block }),
  findBlockById: (id: string) => get().rootBlock.findBlockById(id),
  updateBlockById: (id: string, block: BlockEntity) => {
    // [P1] @owner: mutate/immutable が混在。Block 側はミューテーション、ここは再構築。
    // 方針を統一（完全イミュータブル or immer でミューテーション）すること。
    const root = createBlock(get().rootBlock);
    const updatedRoot = root.updateBlockById(id, block);
    set({ rootBlock: createBlock(updatedRoot) });
  },
  splitBlockAtCaret: (
    id: string,
    beforeCursor: string,
    afterCursor: string,
  ) => {
    const block = get().rootBlock.findBlockById(id);
    if (!block) {
      throw new Error(`Block with id ${id} was not found`);
    }
    const { newBlock } = splitBlockAtCaret(block, beforeCursor, afterCursor);
    // [P1] @owner: 新規挿入後は親/旧ブロック側の更新を set する方が安全（木全体の一貫性のため）。
    get().updateBlockById(newBlock.id, newBlock);
    return newBlock;
  },
  caretPosition: null,
  setCaretPosition: (position) => set({ caretPosition: position }),
}));

export function setToLocalStorage(rootBlock: BlockEntity) {
  if (typeof window === "undefined") {
    return;
  }
  // [P2] @owner: 保存はレンダー中ではなく、state 変更に同期して呼ぶ（useEffect などでトリガ）。
  window.localStorage.setItem(rootBlockKey, JSON.stringify(rootBlock.toJSON()));
}
export function resetLocalStorage() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(rootBlockKey);

  useStore.setState({
    rootBlock: createBlock(initialRootBlock),
    caretPosition: null,
  });
}

function splitBlockAtCaret(
  block: BlockEntity,
  beforeCursor: string,
  afterCursor: string,
) {
  console.log("splitBlockAtCaret", { beforeCursor, afterCursor });
  block.content = beforeCursor;

  if (block.children.length > 0) {
    const newBlock = new BlockEntity(afterCursor, []).withParent(block);
    // [P1] @owner: 直接ミューテーション（splice）を使用。イミュータブル方針なら新しい配列を作成する実装に変更すること。
    block.children.splice(0, 0, newBlock);
    return { block, newBlock };
  }

  const newBlock = new BlockEntity(afterCursor, []).withParent(block.parent);
  const [_parent, idx] = block.getParentAndIndex();
  // [P1] @owner: ここもミューテーション。イミュータブル方針との整合性を取ること。
  block.parent?.children.splice(idx + 1, 0, newBlock);
  return { block, newBlock };
}
