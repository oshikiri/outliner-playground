import { render } from "preact";
import type { ComponentChildren, JSX } from "preact";
import { useEffect, useMemo } from "preact/hooks";

import type BlockEntity from "./block/BlockEntity";
import { createBlock } from "./block/BlockEntity";
import BlockComponent from "./block/BlockComponent";
import { initialRootBlock } from "./block/data";
import { initializeState, useEditorSession, useRootBlock } from "./state";

import "./styles.css";

initializeState(createBlock(initialRootBlock));

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.warn('Root element "#root" was not found.');
} else {
  render(<App />, rootElement);
}

function App(): JSX.Element {
  const [rootBlock, setRootBlock] = useRootBlock();
  const [, setEditorSession] = useEditorSession();

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent): void => {
      if (event.key === "k" && event.ctrlKey) {
        setRootBlock(createBlock(initialRootBlock));
        setEditorSession(null);
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [setEditorSession, setRootBlock]);

  return (
    <div
      className="flex justify-center h-full
        portrait:flex-col portrait:w-full
        landscape:flex-row"
      role="main"
    >
      <EditorPanel rootBlock={rootBlock} />
      <JsonPanel rootBlock={rootBlock} />
    </div>
  );
}

function EditorPanel({ rootBlock }: { rootBlock: BlockEntity }): JSX.Element {
  return (
    <Panel>
      {rootBlock.children.map((block: BlockEntity) => (
        <BlockComponent key={block.id} block={block} />
      ))}
    </Panel>
  );
}

function JsonPanel({ rootBlock }: { rootBlock: BlockEntity }): JSX.Element {
  const jsonStr = useMemo(() => {
    return JSON.stringify(rootBlock.toJSON(), null, 2);
  }, [rootBlock]);

  return (
    <Panel>
      <pre className="text-xs whitespace-pre-wrap break-all">{jsonStr}</pre>
    </Panel>
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
