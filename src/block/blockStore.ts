import BlockEntity from "./BlockEntity";

export type BlockState = {
  id: string;
  content: string;
  childrenIds: string[];
  parentId: string | null;
};

export type BlockStore = {
  rootId: string;
  blocksById: Record<string, BlockState>;
};

export type BlockTreeLike = {
  id: string;
  content: string;
  children?: BlockTreeLike[];
};

export function createEmptyBlockStore(): BlockStore {
  const rootId = crypto.randomUUID();
  return {
    rootId,
    blocksById: {
      [rootId]: {
        id: rootId,
        content: "",
        childrenIds: [],
        parentId: null,
      },
    },
  };
}

export function isBlockStore(value: unknown): value is BlockStore {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    rootId?: unknown;
    blocksById?: unknown;
  };

  return (
    typeof candidate.rootId === "string" &&
    candidate.blocksById !== null &&
    typeof candidate.blocksById === "object"
  );
}

export function createBlockStore(rootBlock: BlockTreeLike): BlockStore {
  const blocksById: Record<string, BlockState> = {};

  const visit = (block: BlockTreeLike, parentId: string | null): void => {
    const children = block.children ?? [];
    blocksById[block.id] = {
      id: block.id,
      content: block.content,
      childrenIds: children.map((child) => child.id),
      parentId,
    };

    for (const child of children) {
      visit(child, block.id);
    }
  };

  visit(rootBlock, null);

  return {
    rootId: rootBlock.id,
    blocksById,
  };
}

export function createBlockTree(
  rootBlock: BlockStore,
  blockId: string = rootBlock.rootId,
): BlockEntity {
  const block = getBlockOrThrow(rootBlock, blockId);
  const children = block.childrenIds.map((childId) =>
    createBlockTree(rootBlock, childId),
  );
  const tree = new BlockEntity(block.content, children);
  tree.id = block.id;
  return tree;
}

export function getBlock(
  rootBlock: BlockStore,
  blockId: string,
): BlockState | null {
  return rootBlock.blocksById[blockId] ?? null;
}

export function getChildBlocks(
  rootBlock: BlockStore,
  blockId: string,
): BlockState[] {
  const block = getBlock(rootBlock, blockId);
  if (!block) {
    return [];
  }

  return block.childrenIds
    .map((childId) => getBlock(rootBlock, childId))
    .filter((child): child is BlockState => child !== null);
}

export function updateBlockContent(
  rootBlock: BlockStore,
  blockId: string,
  content: string,
): BlockStore {
  const currentBlock = getBlock(rootBlock, blockId);
  if (!currentBlock || currentBlock.content === content) {
    return rootBlock;
  }

  return withBlocks(rootBlock, {
    [blockId]: {
      ...currentBlock,
      content,
    },
  });
}

export function splitBlockAtCaret(
  rootBlock: BlockStore,
  blockId: string,
  beforeCaretText: string,
  afterCaretText: string,
): {
  rootBlock: BlockStore;
  newBlock: BlockState;
} {
  const currentBlock = getBlockOrThrow(rootBlock, blockId);
  if (currentBlock.parentId === null) {
    throw new Error("Cannot split the hidden root block.");
  }

  const nextCurrentBlock: BlockState = {
    ...currentBlock,
    content: beforeCaretText,
  };
  const newBlockId = crypto.randomUUID();
  const nextBlocksById: Record<string, BlockState> = {
    ...rootBlock.blocksById,
    [blockId]: nextCurrentBlock,
  };

  if (currentBlock.childrenIds.length > 0) {
    const newBlock: BlockState = {
      id: newBlockId,
      content: afterCaretText,
      childrenIds: [],
      parentId: currentBlock.id,
    };
    nextBlocksById[blockId] = {
      ...nextCurrentBlock,
      childrenIds: [newBlockId, ...currentBlock.childrenIds],
    };
    nextBlocksById[newBlockId] = newBlock;

    return {
      rootBlock: {
        ...rootBlock,
        blocksById: nextBlocksById,
      },
      newBlock,
    };
  }

  const parentBlock = getBlockOrThrow(rootBlock, currentBlock.parentId);
  const currentIndex = parentBlock.childrenIds.indexOf(blockId);
  if (currentIndex === -1) {
    throw new Error(`Block ${blockId} was not found in its parent.`);
  }

  const newBlock: BlockState = {
    id: newBlockId,
    content: afterCaretText,
    childrenIds: [],
    parentId: parentBlock.id,
  };
  nextBlocksById[parentBlock.id] = {
    ...parentBlock,
    childrenIds: insertChildId(
      parentBlock.childrenIds,
      currentIndex + 1,
      newBlockId,
    ),
  };
  nextBlocksById[newBlockId] = newBlock;

  return {
    rootBlock: {
      ...rootBlock,
      blocksById: nextBlocksById,
    },
    newBlock,
  };
}

export function indentBlock(
  rootBlock: BlockStore,
  blockId: string,
): BlockStore {
  const currentBlock = getBlock(rootBlock, blockId);
  if (!currentBlock || currentBlock.parentId === null) {
    return rootBlock;
  }

  const parentBlock = getBlock(rootBlock, currentBlock.parentId);
  if (!parentBlock) {
    return rootBlock;
  }

  const currentIndex = parentBlock.childrenIds.indexOf(blockId);
  if (currentIndex <= 0) {
    return rootBlock;
  }

  const previousSiblingId = parentBlock.childrenIds[currentIndex - 1];
  if (!previousSiblingId) {
    return rootBlock;
  }
  const previousSibling = getBlockOrThrow(rootBlock, previousSiblingId);

  return withBlocks(rootBlock, {
    [parentBlock.id]: {
      ...parentBlock,
      childrenIds: removeChildId(parentBlock.childrenIds, blockId),
    },
    [previousSibling.id]: {
      ...previousSibling,
      childrenIds: [...previousSibling.childrenIds, blockId],
    },
    [blockId]: {
      ...currentBlock,
      parentId: previousSibling.id,
    },
  });
}

export function outdentBlock(
  rootBlock: BlockStore,
  blockId: string,
): BlockStore {
  const currentBlock = getBlock(rootBlock, blockId);
  if (!currentBlock || currentBlock.parentId === null) {
    return rootBlock;
  }

  const parentBlock = getBlock(rootBlock, currentBlock.parentId);
  if (!parentBlock || parentBlock.parentId === null) {
    return rootBlock;
  }

  const grandparentBlock = getBlockOrThrow(rootBlock, parentBlock.parentId);
  const currentIndex = parentBlock.childrenIds.indexOf(blockId);
  const parentIndex = grandparentBlock.childrenIds.indexOf(parentBlock.id);
  if (currentIndex === -1 || parentIndex === -1) {
    return rootBlock;
  }

  const siblingsAfter = parentBlock.childrenIds.slice(currentIndex + 1);
  const nextBlocksById: Record<string, BlockState> = {
    ...rootBlock.blocksById,
    [parentBlock.id]: {
      ...parentBlock,
      childrenIds: parentBlock.childrenIds.slice(0, currentIndex),
    },
    [grandparentBlock.id]: {
      ...grandparentBlock,
      childrenIds: insertChildId(
        grandparentBlock.childrenIds,
        parentIndex + 1,
        blockId,
      ),
    },
    [blockId]: {
      ...currentBlock,
      parentId: grandparentBlock.id,
      childrenIds: [...currentBlock.childrenIds, ...siblingsAfter],
    },
  };

  for (const siblingId of siblingsAfter) {
    const sibling = getBlock(rootBlock, siblingId);
    if (!sibling) {
      continue;
    }
    nextBlocksById[siblingId] = {
      ...sibling,
      parentId: blockId,
    };
  }

  return {
    ...rootBlock,
    blocksById: nextBlocksById,
  };
}

export function moveBlockUp(
  rootBlock: BlockStore,
  blockId: string,
): BlockStore {
  const parentInfo = getParentAndIndex(rootBlock, blockId);
  if (!parentInfo || parentInfo.index <= 0) {
    return rootBlock;
  }

  return swapSiblingOrder(
    rootBlock,
    parentInfo.parent.id,
    parentInfo.index - 1,
  );
}

export function moveBlockDown(
  rootBlock: BlockStore,
  blockId: string,
): BlockStore {
  const parentInfo = getParentAndIndex(rootBlock, blockId);
  if (
    !parentInfo ||
    parentInfo.index >= parentInfo.parent.childrenIds.length - 1
  ) {
    return rootBlock;
  }

  return swapSiblingOrder(rootBlock, parentInfo.parent.id, parentInfo.index);
}

export function getNextBlock(
  rootBlock: BlockStore,
  blockId: string,
): BlockState | null {
  const currentBlock = getBlock(rootBlock, blockId);
  if (!currentBlock) {
    return null;
  }

  if (currentBlock.childrenIds.length > 0) {
    return getBlock(rootBlock, currentBlock.childrenIds[0] ?? "");
  }

  let currentId = currentBlock.id;
  while (true) {
    const parentInfo = getParentAndIndex(rootBlock, currentId);
    if (!parentInfo) {
      return null;
    }
    const nextSiblingId =
      parentInfo.parent.childrenIds[parentInfo.index + 1] ?? null;
    if (nextSiblingId) {
      return getBlock(rootBlock, nextSiblingId);
    }
    currentId = parentInfo.parent.id;
  }
}

export function getPrevBlock(
  rootBlock: BlockStore,
  blockId: string,
): BlockState | null {
  const parentInfo = getParentAndIndex(rootBlock, blockId);
  if (!parentInfo) {
    return null;
  }

  if (parentInfo.index === 0) {
    return getBlock(rootBlock, parentInfo.parent.id);
  }

  const previousSiblingId = parentInfo.parent.childrenIds[parentInfo.index - 1];
  if (!previousSiblingId) {
    return null;
  }

  return getLastDescendant(rootBlock, previousSiblingId);
}

export function joinBlockWithPreviousSibling(
  rootBlock: BlockStore,
  blockId: string,
  currentContent: string,
): {
  rootBlock: BlockStore;
  previousBlock: BlockState;
  caretOffset: number;
} | null {
  const currentBlock = getBlock(rootBlock, blockId);
  if (!currentBlock || currentBlock.childrenIds.length > 0) {
    return null;
  }

  const previousBlock = getPrevBlock(rootBlock, blockId);
  if (!previousBlock || previousBlock.parentId === null) {
    return null;
  }

  const parentInfo = getParentAndIndex(rootBlock, blockId);
  if (!parentInfo) {
    return null;
  }

  const nextPreviousBlock: BlockState = {
    ...previousBlock,
    content: `${previousBlock.content}${currentContent}`,
  };
  const nextBlocksById: Record<string, BlockState> = {
    ...rootBlock.blocksById,
    [previousBlock.id]:
      previousBlock.id === parentInfo.parent.id
        ? {
            ...nextPreviousBlock,
            childrenIds: removeChildId(parentInfo.parent.childrenIds, blockId),
          }
        : nextPreviousBlock,
    [parentInfo.parent.id]:
      previousBlock.id === parentInfo.parent.id
        ? {
            ...nextPreviousBlock,
            childrenIds: removeChildId(parentInfo.parent.childrenIds, blockId),
          }
        : {
            ...parentInfo.parent,
            childrenIds: removeChildId(parentInfo.parent.childrenIds, blockId),
          },
  };
  delete nextBlocksById[blockId];

  return {
    rootBlock: {
      ...rootBlock,
      blocksById: nextBlocksById,
    },
    previousBlock: nextPreviousBlock,
    caretOffset: previousBlock.content.length,
  };
}

function getBlockOrThrow(rootBlock: BlockStore, blockId: string): BlockState {
  const block = getBlock(rootBlock, blockId);
  if (!block) {
    throw new Error(`Block ${blockId} was not found.`);
  }
  return block;
}

function getParentAndIndex(
  rootBlock: BlockStore,
  blockId: string,
): {
  parent: BlockState;
  index: number;
} | null {
  const currentBlock = getBlock(rootBlock, blockId);
  if (!currentBlock?.parentId) {
    return null;
  }

  const parent = getBlock(rootBlock, currentBlock.parentId);
  if (!parent) {
    return null;
  }

  const index = parent.childrenIds.indexOf(blockId);
  if (index === -1) {
    return null;
  }

  return { parent, index };
}

function getLastDescendant(rootBlock: BlockStore, blockId: string): BlockState {
  let currentBlock = getBlockOrThrow(rootBlock, blockId);
  while (currentBlock.childrenIds.length > 0) {
    const lastChildId =
      currentBlock.childrenIds[currentBlock.childrenIds.length - 1];
    currentBlock = getBlockOrThrow(rootBlock, lastChildId ?? "");
  }
  return currentBlock;
}

function swapSiblingOrder(
  rootBlock: BlockStore,
  parentId: string,
  leftIndex: number,
): BlockStore {
  const parent = getBlockOrThrow(rootBlock, parentId);
  const childrenIds = [...parent.childrenIds];
  const leftChildId = childrenIds[leftIndex];
  const rightChildId = childrenIds[leftIndex + 1];
  if (!leftChildId || !rightChildId) {
    return rootBlock;
  }

  childrenIds[leftIndex] = rightChildId;
  childrenIds[leftIndex + 1] = leftChildId;

  return withBlocks(rootBlock, {
    [parentId]: {
      ...parent,
      childrenIds,
    },
  });
}

function withBlocks(
  rootBlock: BlockStore,
  blocks: Record<string, BlockState>,
): BlockStore {
  return {
    ...rootBlock,
    blocksById: {
      ...rootBlock.blocksById,
      ...blocks,
    },
  };
}

function insertChildId(
  childrenIds: string[],
  index: number,
  childId: string,
): string[] {
  return [...childrenIds.slice(0, index), childId, ...childrenIds.slice(index)];
}

function removeChildId(childrenIds: string[], childId: string): string[] {
  return childrenIds.filter((id) => id !== childId);
}
