import { atom, getDefaultStore, useAtom, type SetStateAction } from "jotai";

import BlockEntity from "./block/BlockEntity";

export type EditorSession = {
  activeBlockId: string;
  caretOffset: number;
  draftText: string;
} | null;

const rootBlockAtom = atom<BlockEntity>(new BlockEntity(""));
const editorSessionAtom = atom<EditorSession>(null);

export function initializeState(rootBlock: BlockEntity): void {
  getDefaultStore().set(rootBlockAtom, rootBlock);
  getDefaultStore().set(editorSessionAtom, null);
}

export function useRootBlock(): [BlockEntity, (updateFn: UpdateBlock) => void] {
  return useAtom(rootBlockAtom);
}

type UpdateBlock = SetStateAction<BlockEntity>;

export function useEditorSession(): [
  EditorSession,
  (updateFn: UpdateEditorSession) => void,
] {
  return useAtom(editorSessionAtom);
}

export type UpdateEditorSession = SetStateAction<EditorSession>;
