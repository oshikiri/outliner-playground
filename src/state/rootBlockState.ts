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

import type { EditorSession } from "../block/editorSession";
import * as blockStore from "../block/blockStore";
import type {
  BlockState,
  BlockStore,
  BlockTreeLike,
} from "../block/blockStore";
import { editorSessionAtom } from "./editorSessionState";

const rootBlockAtom = atom<BlockStore>(blockStore.createEmptyBlockStore());

type UpdateBlock = SetStateAction<BlockStore>;

export function initializeState(rootBlock: BlockStore | BlockTreeLike): void {
  getDefaultStore().set(
    rootBlockAtom,
    blockStore.isBlockStore(rootBlock)
      ? rootBlock
      : blockStore.createBlockStore(rootBlock),
  );
  getDefaultStore().set(editorSessionAtom, null);
}

export function useRootBlock(): [BlockStore, (updateFn: UpdateBlock) => void] {
  return useAtom(rootBlockAtom);
}

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
      setRootBlock((prev) =>
        blockStore.updateBlockContent(prev, blockId, content),
      );
    },
    [setRootBlock],
  );
}

export function useSplitBlockAtCaret(): (
  blockId: string,
  beforeCaretText: string,
  afterCaretText: string,
) => BlockState {
  const setRootBlock = useSetRootBlock();

  return useCallback(
    (blockId, beforeCaretText, afterCaretText) => {
      let newBlock: BlockState | null = null;

      setRootBlock((prev) => {
        const nextRootBlock = blockStore.splitBlockAtCaret(
          prev,
          blockId,
          beforeCaretText,
          afterCaretText,
        );
        newBlock = nextRootBlock.newBlock;
        return nextRootBlock.rootBlock;
      });

      if (!newBlock) {
        throw new Error(`Failed to split block "${blockId}".`);
      }

      return newBlock;
    },
    [setRootBlock],
  );
}

export function useIndentBlock(): (blockId: string, content: string) => void {
  const setRootBlock = useSetRootBlock();

  return useCallback(
    (blockId, content) => {
      setRootBlock((prev) =>
        blockStore.indentBlock(
          blockStore.updateBlockContent(prev, blockId, content),
          blockId,
        ),
      );
    },
    [setRootBlock],
  );
}

export function useOutdentBlock(): (blockId: string, content: string) => void {
  const setRootBlock = useSetRootBlock();

  return useCallback(
    (blockId, content) => {
      setRootBlock((prev) =>
        blockStore.outdentBlock(
          blockStore.updateBlockContent(prev, blockId, content),
          blockId,
        ),
      );
    },
    [setRootBlock],
  );
}

export function useMoveBlockUp(): (blockId: string, content: string) => void {
  const setRootBlock = useSetRootBlock();

  return useCallback(
    (blockId, content) => {
      setRootBlock((prev) =>
        blockStore.moveBlockUp(
          blockStore.updateBlockContent(prev, blockId, content),
          blockId,
        ),
      );
    },
    [setRootBlock],
  );
}

export function useMoveBlockDown(): (blockId: string, content: string) => void {
  const setRootBlock = useSetRootBlock();

  return useCallback(
    (blockId, content) => {
      setRootBlock((prev) =>
        blockStore.moveBlockDown(
          blockStore.updateBlockContent(prev, blockId, content),
          blockId,
        ),
      );
    },
    [setRootBlock],
  );
}

export function useJoinBlockWithPreviousSibling(): (
  blockId: string,
  currentContent: string,
) => {
  rootBlock: BlockStore;
  previousBlock: BlockState;
  caretOffset: number;
} | null {
  const setRootBlock = useSetRootBlock();

  return useCallback(
    (blockId, currentContent) => {
      let mergedBlockResult: {
        rootBlock: BlockStore;
        previousBlock: BlockState;
        caretOffset: number;
      } | null = null;

      setRootBlock((prev) => {
        mergedBlockResult = blockStore.joinBlockWithPreviousSibling(
          prev,
          blockId,
          currentContent,
        );
        return mergedBlockResult?.rootBlock ?? prev;
      });

      return mergedBlockResult;
    },
    [setRootBlock],
  );
}

export function useBlock(blockId: string): BlockState | null {
  const blockAtom = useMemo(() => {
    return selectAtom(rootBlockAtom, (rootBlock) =>
      blockStore.findBlock(rootBlock, blockId),
    );
  }, [blockId]);

  return useAtomValue(blockAtom);
}

export function useRootChildBlockIds(): readonly string[] {
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
      return JSON.stringify(blockStore.createBlockTreeLike(rootBlock), null, 2);
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

      return blockStore.updateBlockContent(
        rootBlock,
        editorSession.activeBlockId,
        editorSession.draftText,
      );
    });
  }, [editorSession]);

  return useAtomValue(persistedRootBlockAtom);
}
