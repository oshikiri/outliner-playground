import { atom, useAtom } from "jotai";

import BlockEntity from "./block/BlockEntity";
import { initialRootBlock } from "./block/data";

export type CaretPosition = {
  blockId: string;
  caretOffset: number;
} | null;

const rootBlockAtom = atom<BlockEntity>(initialRootBlock);
const caretPositionAtom = atom<CaretPosition>(null);

export function useRootBlock(): [BlockEntity, (updateFn: UpdateBlock) => void] {
  // @owner [P1] jotaiのSetStateAction型そのものを使わず独自シグネチャを強制しているためコメント指摘のとおり型が実装と一致していません
  return useAtom(rootBlockAtom);
}

type UpdateBlock = (prev: BlockEntity) => BlockEntity;

export function useCaretPosition(): [
  CaretPosition,
  (updateFn: UpdateCaretPosition) => void,
] {
  // @owner [P1] ここも同様にSetStateActionを使わず、値を直接渡したいケースで冗長な`()=>value`が必要になっています
  return useAtom(caretPositionAtom);
}

export type UpdateCaretPosition = (prev: CaretPosition) => CaretPosition;
