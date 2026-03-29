import BlockEntity from "../core/block/BlockEntity";
import { findBlock, type BlockStore } from "../core/block/blockStore";

export function createBlockTree(
  rootBlock: BlockStore,
  blockId: string = rootBlock.rootId,
): BlockEntity {
  const block = findBlock(rootBlock, blockId);
  if (!block) {
    throw new Error(`Block ${blockId} was not found.`);
  }

  const children = block.childrenIds.map((childId) =>
    createBlockTree(rootBlock, childId),
  );
  const tree = new BlockEntity(block.content, children);
  tree.id = block.id;
  return tree;
}
