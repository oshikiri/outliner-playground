import {
  atom,
  getDefaultStore,
  useAtom,
  useAtomValue,
  useSetAtom,
  type SetStateAction,
} from "jotai";
import { selectAtom } from "jotai/utils";
import { useMemo } from "preact/hooks";

import {
  createBlockStore,
  createEmptyBlockStore,
  getBlock,
  isBlockStore,
  type BlockState,
  type BlockStore,
  type BlockTreeLike,
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

export function useRootBlockValue(): BlockStore {
  return useAtomValue(rootBlockAtom);
}

export function useSetRootBlock(): (updateFn: UpdateBlock) => void {
  return useSetAtom(rootBlockAtom);
}

export function useBlock(blockId: string): BlockState | null {
  const blockAtom = useMemo(() => {
    return selectAtom(rootBlockAtom, (rootBlock) =>
      getBlock(rootBlock, blockId),
    );
  }, [blockId]);

  return useAtomValue(blockAtom);
}

export function useEditorSession(): [
  EditorSession,
  (updateFn: UpdateEditorSession) => void,
] {
  return useAtom(editorSessionAtom);
}

export type UpdateEditorSession = SetStateAction<EditorSession>;
