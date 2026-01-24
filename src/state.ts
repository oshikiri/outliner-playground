import { atom, getDefaultStore, useAtom, type SetStateAction } from "jotai";

import BlockEntity from "./block/BlockEntity";

export type CaretPosition = {
  blockId: string;
  caretOffset: number;
} | null;

const rootBlockAtom = atom<BlockEntity>(new BlockEntity(""));
const caretPositionAtom = atom<CaretPosition>(null);

export function initializeState(rootBlock: BlockEntity): void {
  getDefaultStore().set(rootBlockAtom, rootBlock);
}

export function useRootBlock(): [BlockEntity, (updateFn: UpdateBlock) => void] {
  return useAtom(rootBlockAtom);
}

type UpdateBlock = SetStateAction<BlockEntity>;

export function useCaretPosition(): [
  CaretPosition,
  (updateFn: UpdateCaretPosition) => void,
] {
  return useAtom(caretPositionAtom);
}

export type UpdateCaretPosition = SetStateAction<CaretPosition>;
