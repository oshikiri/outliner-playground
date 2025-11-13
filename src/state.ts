import { atom, useAtom } from "jotai";

import BlockEntity from "./block/BlockEntity";
import { initialRootBlock } from "./block/data";

export type CaretPosition = {
  blockId: string;
  caretOffset: number;
} | null;

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
