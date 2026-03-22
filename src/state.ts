import { atom, getDefaultStore, useAtom, type SetStateAction } from "jotai";

import type { BlockStore, BlockTreeLike } from "./block/blockStore";
import {
  createBlockStore,
  createEmptyBlockStore,
  isBlockStore,
} from "./block/blockStore";

export type EditorSession = {
  activeBlockId: string;
  caretOffset: number;
  draftText: string;
} | null;

const rootBlockAtom = atom<BlockStore>(createEmptyBlockStore());
const editorSessionAtom = atom<EditorSession>(null);

export function initializeState(rootBlock: BlockStore | BlockTreeLike): void {
  getDefaultStore().set(
    rootBlockAtom,
    isBlockStore(rootBlock) ? rootBlock : createBlockStore(rootBlock),
  );
  getDefaultStore().set(editorSessionAtom, null);
}

export function useRootBlock(): [BlockStore, (updateFn: UpdateBlock) => void] {
  return useAtom(rootBlockAtom);
}

type UpdateBlock = SetStateAction<BlockStore>;

export function useEditorSession(): [
  EditorSession,
  (updateFn: UpdateEditorSession) => void,
] {
  return useAtom(editorSessionAtom);
}

export type UpdateEditorSession = SetStateAction<EditorSession>;
