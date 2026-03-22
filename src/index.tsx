import { render } from "preact";
import type { ComponentChildren, JSX } from "preact";
import { useEffect, useMemo } from "preact/hooks";

import type BlockEntity from "./block/BlockEntity";
import { createBlock } from "./block/BlockEntity";
import BlockComponent from "./block/BlockComponent";
import { initialRootBlock } from "./block/data";
import { handleGlobalEditorKeydown } from "./keyboardShortcuts";
import {
  getBrowserStorage,
  loadPersistedRootBlock,
  persistRootBlock,
  resolvePersistedRootBlock,
} from "./persistence";
import { initializeState, useEditorSession, useRootBlock } from "./state";

import "./styles.css";

initializeState(
  loadPersistedRootBlock(getBrowserStorage(), createBlock(initialRootBlock)),
);

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.warn('Root element "#root" was not found.');
} else {
  render(<App />, rootElement);
}

function App(): JSX.Element {
  const [rootBlock, setRootBlock] = useRootBlock();
  const [editorSession, setEditorSession] = useEditorSession();
  const jsonStr = useMemo(() => {
    return JSON.stringify(rootBlock.toJSON(), null, 2);
  }, [rootBlock]);
  const persistedRootBlock = useMemo(() => {
    return resolvePersistedRootBlock(rootBlock, editorSession);
  }, [editorSession, rootBlock]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent): void => {
      handleGlobalEditorKeydown(event, {
        resetRootBlock: () => setRootBlock(createBlock(initialRootBlock)),
        resetEditorSession: () => setEditorSession(null),
      });
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [setEditorSession, setRootBlock]);

  useEffect(() => {
    persistRootBlock(getBrowserStorage(), persistedRootBlock);
  }, [persistedRootBlock]);

  return (
    <div
      className="flex justify-center h-full
        portrait:flex-col portrait:w-full
        landscape:flex-row"
      role="main"
    >
      <Panel>
        {rootBlock.children.map((block: BlockEntity) => (
          <BlockComponent key={block.id} block={block} />
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
