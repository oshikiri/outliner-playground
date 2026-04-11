import {
  createBlockStore,
  createBlockTreeLike,
  isBlockStore,
  type BlockStore,
  type BlockTreeLike,
} from "../core/block/blockStore";
import * as logger from "../shared/logger";

const PERSISTED_EDITOR_STORAGE_KEY = "outliner-playground.rootBlock";
const INITIAL_STORAGE_VERSION = 0;

type PersistedEditorState = {
  rootBlock: BlockStore;
  version: number;
};

type PersistEditorStateResult =
  | {
      status: "saved";
      persistedState: PersistedEditorState;
    }
  | {
      status: "conflict";
      latestState: PersistedEditorState;
    }
  | {
      status: "skipped";
    };

type PersistEditorStateOptions = {
  skipConflictCheck?: boolean;
};

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
): PersistedEditorState {
  if (!storage) {
    return {
      rootBlock: fallbackRootBlock,
      version: INITIAL_STORAGE_VERSION,
    };
  }

  const serialized = storage.getItem(PERSISTED_EDITOR_STORAGE_KEY);
  if (!serialized) {
    return {
      rootBlock: fallbackRootBlock,
      version: INITIAL_STORAGE_VERSION,
    };
  }

  try {
    const parsed = JSON.parse(serialized) as unknown;
    if (isPersistedEditorDocument(parsed)) {
      return {
        rootBlock: createBlockStore(parsed.rootBlock),
        version: parsed.version,
      };
    }
    if (isPersistedBlock(parsed)) {
      return {
        rootBlock: createBlockStore(parsed),
        version: INITIAL_STORAGE_VERSION,
      };
    }

    throw new Error("Persisted editor state has an invalid shape.");
  } catch (error) {
    logger.warn("Failed to load persisted editor state.", error);
    return {
      rootBlock: fallbackRootBlock,
      version: INITIAL_STORAGE_VERSION,
    };
  }
}

export function loadBrowserEditorState(
  fallbackRootBlock: BlockStore | BlockTreeLike,
): PersistedEditorState {
  return loadPersistedEditorState(
    getBrowserStorage(),
    isBlockStore(fallbackRootBlock)
      ? fallbackRootBlock
      : createBlockStore(fallbackRootBlock),
  );
}

export function persistEditorState(
  storage: Pick<Storage, "getItem" | "setItem"> | null,
  rootBlock: BlockStore,
  lastReadVersion: number,
  options: PersistEditorStateOptions = {},
): PersistEditorStateResult {
  if (!storage) {
    return { status: "skipped" };
  }

  try {
    const latestState = loadPersistedEditorState(storage, rootBlock);
    const shouldSkipConflictCheck = options.skipConflictCheck ?? false;

    if (!shouldSkipConflictCheck && latestState.version !== lastReadVersion) {
      return {
        status: "conflict",
        latestState,
      };
    }

    const nextVersion = latestState.version + 1;
    const persistedState = {
      rootBlock,
      version: nextVersion,
    } satisfies PersistedEditorState;

    storage.setItem(
      PERSISTED_EDITOR_STORAGE_KEY,
      JSON.stringify(serializePersistedEditorState(persistedState)),
    );
    return {
      status: "saved",
      persistedState,
    };
  } catch (error) {
    logger.warn("Failed to persist editor state.", error);
    return { status: "skipped" };
  }
}

export function persistBrowserEditorState(
  rootBlock: BlockStore,
  lastReadVersion: number,
  options: PersistEditorStateOptions = {},
): PersistEditorStateResult {
  return persistEditorState(
    getBrowserStorage(),
    rootBlock,
    lastReadVersion,
    options,
  );
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

function isPersistedEditorDocument(value: unknown): value is {
  rootBlock: BlockTreeLike;
  version: number;
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as {
    rootBlock?: unknown;
    version?: unknown;
  };

  return (
    isPersistedBlock(candidate.rootBlock) &&
    Number.isInteger(candidate.version) &&
    (candidate.version as number) >= INITIAL_STORAGE_VERSION
  );
}

function serializePersistedEditorState(persistedState: PersistedEditorState): {
  rootBlock: BlockTreeLike;
  version: number;
} {
  return {
    rootBlock: createBlockTreeLike(persistedState.rootBlock),
    version: persistedState.version,
  };
}
