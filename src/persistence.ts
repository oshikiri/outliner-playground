import {
  createBlockStore,
  createBlockTree,
  isBlockStore,
  type BlockStore,
  type BlockTreeLike,
} from "./block/blockStore";
import * as logger from "./logger";

const ROOT_BLOCK_STORAGE_KEY = "outliner-playground.rootBlock";

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    logger.warn("Failed to access localStorage.", error);
    return null;
  }
}

export function loadPersistedRootBlock(
  storage: Pick<Storage, "getItem"> | null,
  fallbackRootBlock: BlockStore,
): BlockStore {
  if (!storage) {
    return fallbackRootBlock;
  }

  const serialized = storage.getItem(ROOT_BLOCK_STORAGE_KEY);
  if (!serialized) {
    return fallbackRootBlock;
  }

  try {
    const parsed = JSON.parse(serialized) as unknown;
    if (!isPersistedRootBlock(parsed)) {
      throw new Error("Persisted rootBlock has an invalid shape.");
    }

    return createBlockStore(parsed);
  } catch (error) {
    logger.warn("Failed to load persisted rootBlock.", error);
    return fallbackRootBlock;
  }
}

export function loadBrowserRootBlock(
  fallbackRootBlock: BlockStore | BlockTreeLike,
): BlockStore {
  return loadPersistedRootBlock(
    getBrowserStorage(),
    isBlockStore(fallbackRootBlock)
      ? fallbackRootBlock
      : createBlockStore(fallbackRootBlock),
  );
}

export function persistRootBlock(
  storage: Pick<Storage, "setItem"> | null,
  rootBlock: BlockStore,
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      ROOT_BLOCK_STORAGE_KEY,
      JSON.stringify(createBlockTree(rootBlock).toJSON()),
    );
  } catch (error) {
    logger.warn("Failed to persist rootBlock.", error);
  }
}

export function persistBrowserRootBlock(rootBlock: BlockStore): void {
  persistRootBlock(getBrowserStorage(), rootBlock);
}

type PersistedRootBlock = BlockTreeLike & {
  children: BlockTreeLike[];
};

function isPersistedRootBlock(value: unknown): value is PersistedRootBlock {
  if (!isPersistedBlock(value)) {
    return false;
  }

  return Array.isArray(value.children);
}

function isPersistedBlock(value: unknown): value is BlockTreeLike {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    id?: unknown;
    content?: unknown;
    children?: unknown;
  };
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.content !== "string"
  ) {
    return false;
  }
  if (candidate.children === undefined) {
    return true;
  }
  if (!Array.isArray(candidate.children)) {
    return false;
  }

  return candidate.children.every((child) => isPersistedBlock(child));
}
