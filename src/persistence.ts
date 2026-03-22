import { commitEditorSessionToRoot } from "./block/editorSession";
import BlockEntity, { createBlock } from "./block/BlockEntity";
import type { EditorSession } from "./state";

const ROOT_BLOCK_STORAGE_KEY = "outliner-playground.rootBlock";

export function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.warn("Failed to access localStorage.", error);
    return null;
  }
}

export function loadPersistedRootBlock(
  storage: Pick<Storage, "getItem"> | null,
  fallbackRootBlock: BlockEntity,
): BlockEntity {
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

    return createBlock(parsed);
  } catch (error) {
    console.warn("Failed to load persisted rootBlock.", error);
    return fallbackRootBlock;
  }
}

export function resolvePersistedRootBlock(
  rootBlock: BlockEntity,
  editorSession: EditorSession,
): BlockEntity {
  return commitEditorSessionToRoot(rootBlock, editorSession);
}

export function persistRootBlock(
  storage: Pick<Storage, "setItem"> | null,
  rootBlock: BlockEntity,
): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(ROOT_BLOCK_STORAGE_KEY, JSON.stringify(rootBlock.toJSON()));
  } catch (error) {
    console.warn("Failed to persist rootBlock.", error);
  }
}

type PersistedBlock = {
  id: string;
  content: string;
  children?: PersistedBlock[];
};

type PersistedRootBlock = PersistedBlock & {
  children: PersistedBlock[];
};

function isPersistedRootBlock(value: unknown): value is PersistedRootBlock {
  if (!isPersistedBlock(value)) {
    return false;
  }

  return Array.isArray(value.children);
}

function isPersistedBlock(value: unknown): value is PersistedBlock {
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
