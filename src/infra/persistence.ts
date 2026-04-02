import {
  createBlockStore,
  createBlockTreeLike,
  isBlockStore,
  type BlockStore,
  type BlockTreeLike,
} from "../core/block/blockStore";
import * as logger from "../shared/logger";

const PERSISTED_EDITOR_STORAGE_KEY = "outliner-playground.rootBlock";

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

export function loadPersistedEditorState(
  storage: Pick<Storage, "getItem"> | null,
  fallbackRootBlock: BlockStore,
): BlockStore {
  if (!storage) {
    return fallbackRootBlock;
  }

  const serialized = storage.getItem(PERSISTED_EDITOR_STORAGE_KEY);
  if (!serialized) {
    return fallbackRootBlock;
  }

  try {
    const parsed = JSON.parse(serialized) as unknown;
    if (!isPersistedBlock(parsed)) {
      throw new Error("Persisted editor state has an invalid shape.");
    }

    return createBlockStore(parsed);
  } catch (error) {
    logger.warn("Failed to load persisted editor state.", error);
    return fallbackRootBlock;
  }
}

export function loadBrowserEditorState(
  fallbackRootBlock: BlockStore | BlockTreeLike,
): BlockStore {
  return loadPersistedEditorState(
    getBrowserStorage(),
    isBlockStore(fallbackRootBlock)
      ? fallbackRootBlock
      : createBlockStore(fallbackRootBlock),
  );
}

export function persistEditorState(
  storage: Pick<Storage, "setItem"> | null,
  rootBlock: BlockStore,
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      PERSISTED_EDITOR_STORAGE_KEY,
      JSON.stringify(createBlockTreeLike(rootBlock)),
    );
  } catch (error) {
    logger.warn("Failed to persist editor state.", error);
  }
}

export function persistBrowserEditorState(rootBlock: BlockStore): void {
  persistEditorState(getBrowserStorage(), rootBlock);
}

function isPersistedBlock(value: unknown): value is BlockTreeLike {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    id?: unknown;
    content?: unknown;
    collapsed?: unknown;
    children?: unknown;
  };
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.content !== "string"
  ) {
    return false;
  }
  if (
    candidate.collapsed !== undefined &&
    typeof candidate.collapsed !== "boolean"
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
