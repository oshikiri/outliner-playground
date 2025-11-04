import { JSX, StrictMode, type ReactNode } from "react";
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

// [P3] @owner: ルートコンポーネント名は `App` とするのが一般的。
function Root(): JSX.Element {
  const rootBlock = useStore((state: any) => state.rootBlock);
  // [P1] @owner: レンダー中の副作用。localStorage 更新は useEffect([rootBlock]) で行うこと。
  setToLocalStorage(rootBlock);

  return (
    <div
      className="flex justify-center h-full
        portrait:flex-col portrait:w-full
        landscape:flex-row"
    >
      {/* // [P3] @owner: "Pane" -> "Panel" / より意味のある名前に（例: EditorPane, StatePane）。 */}
      <Pane key="editor">
        {rootBlock.children.map((block: BlockEntity, i: number) => (
          <BlockComponent key={`${block.id}/${i}`} block={block} />
        ))}
      </Pane>
      {/* // [P3] @owner: key="json" -> "debug" / "stateJson" など、目的を表す命名に。 */}
      <Pane key="json">
        <pre className="text-xs whitespace-pre-wrap break-all">
          {JSON.stringify(rootBlock.toJson(), null, 2)}
        </pre>
      </Pane>
    </div>
  );
}

function Pane({ children }: { children: ReactNode }) {
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
