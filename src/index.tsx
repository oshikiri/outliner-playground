import {
  JSX,
  StrictMode,
  type PropsWithChildren,
  useEffect,
  useMemo,
} from "preact/compat";
import { createRoot } from "preact/compat/client";

import type BlockEntity from "./block/BlockEntity";
import { createBlock } from "./block/BlockEntity";
import BlockComponent from "./block/BlockComponent";
import { initialRootBlock } from "./block/data";
import { useRootBlock, useCaretPosition } from "./state";

import "./styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.warn('Root element "#root" was not found.');
} else {
  const root = createRoot(rootElement);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

function App(): JSX.Element {
  // [P3] App がエディタ/JSONビュー/グローバルキー処理を兼務しており、再利用やテストがしづらい。
  const [rootBlock, setRootBlock] = useRootBlock();
  const [, setCaretPosition] = useCaretPosition();

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "k" && event.ctrlKey) {
        setRootBlock(createBlock(initialRootBlock));
        setCaretPosition(null);
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [setRootBlock, setCaretPosition]);

  const jsonStr = useMemo(() => {
    return JSON.stringify(rootBlock.toJSON(), null, 2);
  }, [rootBlock]);

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

function Panel({ children }: PropsWithChildren): JSX.Element {
  return (
    <div
      className="border border-gray-300
        rounded p-2 overflow-auto
        portrait:h-1/2 portrait:w-full
        landscape:w-1/2"
    >
      {children}
    </div>
  );
}
