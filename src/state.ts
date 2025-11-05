import { create } from "zustand";

import BlockEntity, { createBlock } from "./block/BlockEntity";
import { initialPage } from "./block/data";

const rootBlockKey = "rootBlock";
// [P3] @owner: `rootBlockFromLocalStorage` -> `rootBlockJson` / `savedRootBlock` など役割が分かる命名に。
const rootBlockFromLocalStorage =
  typeof window !== "undefined"
    ? window.localStorage.getItem(rootBlockKey)
    : null;
// [P3] @owner: `rootBlock` は後続で実体（Block）にも使うため、ここは `rootBlockData` 等に分けると読みやすい。
const rootBlock = rootBlockFromLocalStorage
  ? JSON.parse(rootBlockFromLocalStorage)
  : initialPage;

// [P2] @owner: Zustand のステート型を定義し、セレクタに any を使わないようにすること。
export const useStore = create((set, get: any) => ({
  rootBlock: createBlock(rootBlock),
  setRootBlock: (block: BlockEntity) => set({ rootBlock: block }),
  // [P2] @owner: 検索系は `findBlockById` の方が null 返却と整合的。
  getBlockById: (id: string) => get().rootBlock.getBlockById(id),
  // [P2] @owner: `setBlockById` -> `updateBlockById` にすると Block 側の命名と一致。
  setBlockById: (id: string, block: BlockEntity) => {
    // [P1] @owner: mutate/immutable が混在。Block 側はミューテーション、ここは再構築。
    // 方針を統一（完全イミュータブル or immer でミューテーション）すること。
    const root = createBlock(get().rootBlock);
    const updatedRoot = root.updateBlockById(id, block);
    set({ rootBlock: createBlock(updatedRoot) });
  },
  // [P2] @owner: `createNextBlock` -> `insertNextBlock` / `splitBlockAtCursor` の方が意図が明確。
  createNextBlock: (id: string, beforeCursor: string, afterCursor: string) => {
    // [P1] @owner: getBlockById は null になり得るためガードを追加。
    const block = get().rootBlock.getBlockById(id);
    const { newBlock } = createNext(block, beforeCursor, afterCursor);
    // [P1] @owner: 新規挿入後は親/旧ブロック側の更新を set する方が安全（木全体の一貫性のため）。
    get().setBlockById(newBlock.id, newBlock);
    return newBlock;
  },
  cursorPosition: null,
  // [P3] @owner: `startOffset` -> `caretOffset` など名称統一。
  setCursorPosition: (blockId: string, startOffset: number) =>
    set({ cursorPosition: { blockId, startOffset } }),
}));

export function setToLocalStorage(rootBlock: BlockEntity) {
  if (typeof window === "undefined") {
    return;
  }
  // [P2] @owner: 保存はレンダー中ではなく、state 変更に同期して呼ぶ（useEffect などでトリガ）。
  window.localStorage.setItem(rootBlockKey, JSON.stringify(rootBlock.toJSON()));
}
export function clearLocalStorage() {
  if (typeof window === "undefined") {
    return;
  }
  // [P2] @owner: localStorage クリア時にストアも初期状態へリセットすると UI と一致する。
  window.localStorage.removeItem(rootBlockKey);
}

// [P2] @owner: `createNext` は曖昧。`insertNextBlock` / `splitAtCursor` などへ改名検討。
function createNext(
  block: BlockEntity,
  beforeCursor: string,
  afterCursor: string,
) {
  console.log("createNext", { beforeCursor, afterCursor });
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
