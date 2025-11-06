import { JSX, StrictMode, type ReactNode, useEffect } from "react";
import { createRoot } from "react-dom/client";

import BlockEntity from "./block/BlockEntity";
import BlockComponent from "./block/BlockComponent";
import { useStore, setToLocalStorage, resetLocalStorage } from "./state";

import "./styles.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

function App(): JSX.Element {
  const rootBlock = useStore((state) => state.rootBlock);

  useEffect(() => {
    setToLocalStorage(rootBlock);
  }, [rootBlock]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "k" && event.ctrlKey) {
        resetLocalStorage();
        event.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  return (
    <div
      className="flex justify-center h-full
        portrait:flex-col portrait:w-full
        landscape:flex-row"
    >
      <Panel key="editor">
        {rootBlock.children.map((block: BlockEntity) => (
          <BlockComponent key={block.id} block={block} />
        ))}
      </Panel>
      <Panel key="stateJson">
        <pre className="text-xs whitespace-pre-wrap break-all">
          {JSON.stringify(rootBlock.toJSON(), null, 2)}
        </pre>
      </Panel>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
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
