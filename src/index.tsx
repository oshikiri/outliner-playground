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

// [P3] non-null assertionはDOM存在前提なので、起動時にnullならクラッシュする。
const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

function App(): JSX.Element {
  // [P3] App がエディタ/JSONビュー/グローバルキー処理を兼務しており、再利用やテストがしづらい。
  const [rootBlock, setRootBlock] = useRootBlock();
  const [, setCaretPosition] = useCaretPosition();

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "k" && event.ctrlKey) {
        // [P2] 仕様は localStorage も消すが、現状はメモリのみ初期化なので保存実装後は再読込で戻る。
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
