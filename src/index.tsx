import { JSX, StrictMode, type ReactNode, useEffect } from "react";
import { createRoot } from "react-dom/client";

import BlockEntity, { createBlock } from "./block/BlockEntity";
import BlockComponent from "./block/BlockComponent";
import { initialRootBlock } from "./block/data";
import { useRootBlock, useCaretPosition } from "./state";

import "./styles.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

function App(): JSX.Element {
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
  }, []);
  // @owner [P1] setRootBlock/setCaretPositionに依存しているのに依存配列が空でESLint-hooks違反

  return (
    <div
      className="flex justify-center h-full
        portrait:flex-col portrait:w-full
        landscape:flex-row"
      role="main"
      // @owner [P1] 元指摘のとおりlandmark/aria不足を解消する必要があります
      aria-label="outliner workspace"
    >
      <Panel key="editor">
        {rootBlock.children.map((block: BlockEntity) => (
          <BlockComponent key={block.id} block={block} />
        ))}
      </Panel>
      {/* @owner [P1] 上記Panelは単一要素なのでkey属性は不要です */}
      <Panel key="stateJson">
        <pre className="text-xs whitespace-pre-wrap break-all">
          {JSON.stringify(rootBlock.toJSON(), null, 2)}
          {/* @owner [P1] JSON.stringifyを毎レンダーで実行しておりパフォーマンス懸念 */}
        </pre>
      </Panel>
      {/* @owner [P1] こちらも同様にkey属性が意味をなしていません */}
    </div>
  );
}

// @owner [P1] PropsWithChildren等を使わず手動で子propsを定義しているためDRYでない
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
