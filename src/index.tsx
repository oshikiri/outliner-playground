import { JSX, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import BlockEntity from "./block/BlockEntity";
import BlockComponent from "./block/BlockComponent";
import { useStore, setToLocalStorage, clearLocalStorage } from "./state";

import "./styles.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

function App(): JSX.Element {
  const rootBlock = useStore((state: any) => state.rootBlock);
  // [P1] @owner: レンダー中の副作用。localStorage 更新は useEffect([rootBlock]) で行うこと。
  setToLocalStorage(rootBlock);

  return (
    <div
      className="flex justify-center h-full
        portrait:flex-col portrait:w-full
        landscape:flex-row"
    >
      <Panel key="editor">
        {/* [P2] @owner: key にインデックスを含めるとインデント/並べ替え時に別要素として再生成され、フォーカスやローカル状態が失われる。 */}
        {rootBlock.children.map((block: BlockEntity, i: number) => (
          <BlockComponent key={`${block.id}/${i}`} block={block} />
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

// [P1] @owner: グローバルハンドラは useEffect で登録・クリーンアップする（アンマウント時に解除）。
window.onkeydown = (event) => {
  if (event.key === "k" && event.ctrlKey) {
    clearLocalStorage();
    event.preventDefault();
  }
};
