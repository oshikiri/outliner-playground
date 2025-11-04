import { JSX, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import BlockEntity from "./block/BlockEntity";
import BlockComponent from "./block/BlockComponent";
import { useStore, setToLocalStorage, clearLocalStorage } from "./state";

import "./styles.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

function Root(): JSX.Element {
  const rootBlock = useStore((state: any) => state.rootBlock);
  setToLocalStorage(rootBlock);

  return (
    <div
      className="flex justify-center h-full
        portrait:flex-col portrait:w-full
        landscape:flex-row"
    >
      <Pane key="editor">
        {rootBlock.children.map((block: BlockEntity, i: number) => (
          <BlockComponent key={`${block.id}/${i}`} block={block} />
        ))}
      </Pane>
      <Pane key="json">
        <pre className="text-xs whitespace-pre-wrap break-all">
          {JSON.stringify(rootBlock.toJson(), null, 2)}
        </pre>
      </Pane>
    </div>
  );
}

function Pane({ children }: { children: JSX.Element }) {
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

window.onkeydown = (event) => {
  if (event.key === "k" && event.ctrlKey) {
    clearLocalStorage();
    event.preventDefault();
  }
};
