import { render } from "preact";
import type { ComponentChildren, JSX } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

import { initialRootBlock } from "./core/block/data";
import { createBlockStore } from "./core/block/blockStore";
import {
  loadBrowserEditorState,
  persistBrowserEditorState,
} from "./infra/persistence";
import { handleGlobalEditorKeydown } from "./app/keyboardShortcuts";
import * as logger from "./shared/logger";
import {
  initializeState,
  useEditorSession,
  usePersistedRootBlock,
  useRootBlockJson,
  useRootChildBlockIds,
  useSetRootBlock,
} from "./state";
import BlockComponent from "./ui/block/BlockComponent";

import "./styles.css";

const initialPersistedEditorState = loadBrowserEditorState(initialRootBlock);
initializeState(initialPersistedEditorState.rootBlock);

export function App(): JSX.Element {
  const setRootBlock = useSetRootBlock();
  const [editorSession, setEditorSession] = useEditorSession();
  const rootChildBlockIds = useRootChildBlockIds();
  const jsonStr = useRootBlockJson();
  const persistedRootBlock = usePersistedRootBlock(editorSession);
  const [hasStorageConflict, setHasStorageConflict] = useState(false);
  const hasStorageConflictRef = useRef(false);
  const lastReadVersionRef = useRef(initialPersistedEditorState.version);
  const skipConflictCheckOnceRef = useRef(false);
  const persistedRootBlockRef = useRef(persistedRootBlock);
  const skipPersistEffectRef = useRef(true);

  const updateHasStorageConflict = (nextValue: boolean): void => {
    hasStorageConflictRef.current = nextValue;
    setHasStorageConflict(nextValue);
  };

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent): void => {
      handleGlobalEditorKeydown(event, {
        resetRootBlock: () => setRootBlock(createBlockStore(initialRootBlock)),
        resetEditorSession: () => setEditorSession(null),
      });
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [setEditorSession, setRootBlock]);

  useEffect(() => {
    persistedRootBlockRef.current = persistedRootBlock;

    if (skipPersistEffectRef.current) {
      skipPersistEffectRef.current = false;
      return;
    }

    if (hasStorageConflictRef.current && !skipConflictCheckOnceRef.current) {
      return;
    }

    const skipConflictCheck = skipConflictCheckOnceRef.current;
    skipConflictCheckOnceRef.current = false;

    const result = persistBrowserEditorState(
      persistedRootBlock,
      lastReadVersionRef.current,
      {
        skipConflictCheck,
      },
    );
    if (result.status === "saved") {
      lastReadVersionRef.current = result.persistedState.version;
      updateHasStorageConflict(false);
      return;
    }
    if (result.status === "conflict") {
      updateHasStorageConflict(true);
    }
  }, [persistedRootBlock]);

  useEffect(() => {
    const handleVisibilityChange = (): void => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const latestState = loadBrowserEditorState(persistedRootBlockRef.current);
      if (latestState.version > lastReadVersionRef.current) {
        skipConflictCheckOnceRef.current = false;
        updateHasStorageConflict(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const handleReload = (): void => {
    const persistedState = loadBrowserEditorState(
      persistedRootBlockRef.current,
    );
    skipPersistEffectRef.current = true;
    lastReadVersionRef.current = persistedState.version;
    skipConflictCheckOnceRef.current = false;
    updateHasStorageConflict(false);
    setEditorSession(null);
    setRootBlock(persistedState.rootBlock);
  };

  const handleContinue = (): void => {
    skipConflictCheckOnceRef.current = true;
    updateHasStorageConflict(false);
  };

  return (
    <div className="flex flex-col gap-3 h-full p-3 box-border" role="main">
      {hasStorageConflict ? (
        <div
          className="border border-amber-400 bg-amber-50 text-amber-950
            rounded px-4 py-3 flex flex-col gap-3
            dark:border-amber-300/60 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
        >
          <div className="text-sm">
            別タブまたは別ウィンドウの新しい保存を検知しました。
            最新状態を再読込するか、このまま続けて次の 1
            回だけ上書き保存するかを選んでください。
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded border border-current"
              onClick={handleReload}
              type="button"
            >
              再読込
            </button>
            <button
              className="px-3 py-1.5 rounded border border-current"
              onClick={handleContinue}
              type="button"
            >
              このまま続ける
            </button>
          </div>
        </div>
      ) : null}
      <div
        className="flex justify-center h-full gap-3
          portrait:flex-col portrait:w-full
          landscape:flex-row"
      >
        <Panel>
          {rootChildBlockIds.map((blockId) => (
            <BlockComponent key={blockId} blockId={blockId} />
          ))}
        </Panel>
        <Panel>
          <pre className="text-xs whitespace-pre-wrap break-all">{jsonStr}</pre>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ children }: { children?: ComponentChildren }): JSX.Element {
  return (
    <div
      className="border border-panel-border bg-panel-bg
        rounded p-2 overflow-auto
        portrait:h-1/2 portrait:w-full
        landscape:w-1/2"
    >
      {children}
    </div>
  );
}

if (!import.meta.env.VITEST) {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    logger.warn('Root element "#root" was not found.');
  } else {
    render(<App />, rootElement);
  }
}
