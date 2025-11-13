import { atom, useAtom } from "jotai";

import BlockEntity from "./block/BlockEntity";
import { initialRootBlock } from "./block/data";

export type CaretPosition = {
  blockId: string;
  caretOffset: number;
} | null;

const rootBlockAtom = atom<BlockEntity>(initialRootBlock);
const caretPositionAtom = atom<CaretPosition>(null);

type UpdateBlock = (prev: BlockEntity) => BlockEntity;
export function useRootBlock(): [BlockEntity, (updateFn: UpdateBlock) => void] {
  return useAtom(rootBlockAtom);
}

export type UpdateCaretPosition = (prev: CaretPosition) => CaretPosition;
export function useCaretPosition(): [
  CaretPosition,
  (updateFn: UpdateCaretPosition) => void,
] {
  return useAtom(caretPositionAtom);
}
