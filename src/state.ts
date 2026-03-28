import {
  atom,
  getDefaultStore,
  useAtom,
  useAtomValue,
  useSetAtom,
  type SetStateAction,
} from "jotai";
import { selectAtom } from "jotai/utils";
import { useCallback, useMemo } from "preact/hooks";

import {
  createBlockStore,
  createBlockTree,
  createEmptyBlockStore,
  getBlock,
  isBlockStore,
  updateBlockContent,
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

export function useUpdateBlockContent(): (
  blockId: string,
  content: string,
) => void {
  const setRootBlock = useSetRootBlock();

  return useCallback(
    (blockId, content) => {
      setRootBlock((prev) => updateBlockContent(prev, blockId, content));
    },
    [setRootBlock],
  );
}

export function useBlock(blockId: string): BlockState | null {
  const blockAtom = useMemo(() => {
    return selectAtom(rootBlockAtom, (rootBlock) =>
      getBlock(rootBlock, blockId),
    );
  }, [blockId]);

  return useAtomValue(blockAtom);
}

export function useRootChildBlockIds(): string[] {
  const childIdsAtom = useMemo(() => {
    return selectAtom(rootBlockAtom, (rootBlock) => {
      return rootBlock.blocksById[rootBlock.rootId]?.childrenIds ?? [];
    });
  }, []);

  return useAtomValue(childIdsAtom);
}

export function useRootBlockJson(): string {
  const rootBlockJsonAtom = useMemo(() => {
    return selectAtom(rootBlockAtom, (rootBlock) => {
      return JSON.stringify(createBlockTree(rootBlock).toJSON(), null, 2);
    });
  }, []);

  return useAtomValue(rootBlockJsonAtom);
}

export function usePersistedRootBlock(
  editorSession: EditorSession,
): BlockStore {
  const persistedRootBlockAtom = useMemo(() => {
    return selectAtom(rootBlockAtom, (rootBlock) => {
      if (!editorSession) {
        return rootBlock;
      }

      return updateBlockContent(
        rootBlock,
        editorSession.activeBlockId,
        editorSession.draftText,
      );
    });
  }, [editorSession]);

  return useAtomValue(persistedRootBlockAtom);
}

export function useEditorSession(): [
  EditorSession,
  (updateFn: UpdateEditorSession) => void,
] {
  return useAtom(editorSessionAtom);
}

export type UpdateEditorSession = SetStateAction<EditorSession>;
