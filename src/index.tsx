import { render } from "preact";
import type { ComponentChildren, JSX } from "preact";
import { useEffect } from "preact/hooks";

import BlockComponent from "./block/BlockComponent";
import { initialRootBlock } from "./core/block/data";
import { createBlockStore } from "./core/block/blockStore";
import {
  loadBrowserRootBlock,
  persistBrowserRootBlock,
} from "./infra/persistence";
import { handleGlobalEditorKeydown } from "./keyboardShortcuts";
import * as logger from "./logger";
import {
  initializeState,
  useEditorSession,
  usePersistedRootBlock,
  useRootBlockJson,
  useRootChildBlockIds,
  useSetRootBlock,
} from "./state";

import "./styles.css";

initializeState(loadBrowserRootBlock(initialRootBlock));

const rootElement = document.getElementById("root");
if (!rootElement) {
  logger.warn('Root element "#root" was not found.');
} else {
  render(<App />, rootElement);
}

function App(): JSX.Element {
  const setRootBlock = useSetRootBlock();
  const [editorSession, setEditorSession] = useEditorSession();
  const rootChildBlockIds = useRootChildBlockIds();
  const jsonStr = useRootBlockJson();
  const persistedRootBlock = usePersistedRootBlock(editorSession);

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
    persistBrowserRootBlock(persistedRootBlock);
  }, [persistedRootBlock]);

  return (
    <div
      className="flex justify-center h-full
        portrait:flex-col portrait:w-full
        landscape:flex-row"
      role="main"
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
