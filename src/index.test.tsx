import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/preact";
import type { JSX } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BlockEntity from "./core/block/BlockEntity";
import {
  createBlockStore,
  isBlockStore,
  type BlockStore,
} from "./core/block/blockStore";
import type { EditorSession } from "./state";

describe("App storage conflict", () => {
  let App: () => JSX.Element;
  let initialRootBlock: BlockStore;
  let setPersistedRootBlock: (nextRootBlock: BlockStore) => void;
  let setRootBlockMock: ReturnType<typeof vi.fn>;
  let setEditorSessionMock: ReturnType<typeof vi.fn>;
  let persistenceMock: {
    loadBrowserEditorState: ReturnType<typeof vi.fn>;
    persistBrowserEditorState: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.resetModules();

    initialRootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("initial")]),
    );

    let persistedRootBlockState = initialRootBlock;
    const persistedRootBlockListeners = new Set<(value: BlockStore) => void>();
    let editorSessionState: EditorSession = null;

    setPersistedRootBlock = (nextRootBlock: BlockStore): void => {
      persistedRootBlockState = nextRootBlock;
      for (const listener of persistedRootBlockListeners) {
        listener(nextRootBlock);
      }
    };

    setRootBlockMock = vi.fn();
    setEditorSessionMock = vi.fn((update) => {
      editorSessionState =
        typeof update === "function" ? update(editorSessionState) : update;
    });

    persistenceMock = {
      loadBrowserEditorState: vi.fn(() => ({
        rootBlock: initialRootBlock,
        version: 1,
      })),
      persistBrowserEditorState: vi.fn(() => ({
        status: "saved",
        persistedState: {
          rootBlock: persistedRootBlockState,
          version: 2,
        },
      })),
    };

    vi.doMock("./state", async () => {
      const hooks = await import("preact/hooks");

      return {
        initializeState(rootBlock: BlockStore | BlockEntity): void {
          persistedRootBlockState = isBlockStore(rootBlock)
            ? rootBlock
            : createBlockStore(rootBlock);
        },
        useEditorSession(): [EditorSession, typeof setEditorSessionMock] {
          return [editorSessionState, setEditorSessionMock];
        },
        usePersistedRootBlock(): BlockStore {
          const [value, setValue] = hooks.useState(persistedRootBlockState);

          hooks.useEffect(() => {
            persistedRootBlockListeners.add(setValue);
            return () => persistedRootBlockListeners.delete(setValue);
          }, []);

          return value;
        },
        useRootBlockJson(): string {
          return "{}";
        },
        useRootChildBlockIds(): readonly string[] {
          return [];
        },
        useSetRootBlock(): typeof setRootBlockMock {
          return setRootBlockMock;
        },
      };
    });
    vi.doMock("./infra/persistence", () => persistenceMock);
    vi.doMock("./app/keyboardShortcuts", () => ({
      handleGlobalEditorKeydown: vi.fn(),
    }));
    vi.doMock("./ui/block/BlockComponent", () => ({
      default: () => null,
    }));

    ({ App } = await import("./index"));

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("[OE-STORAGE-007] document.visibilityState が visible になってこのタブへ戻ったときは localStorage の新しい version を検知して競合 banner を表示する", async () => {
    persistenceMock.loadBrowserEditorState.mockReturnValue({
      rootBlock: initialRootBlock,
      version: 2,
    });

    render(<App />);

    fireEvent(document, new Event("visibilitychange"));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "別タブまたは別ウィンドウの新しい保存を検知しました。",
    );
  });

  it("[OE-STORAGE-008] 保存競合の banner で再読込を選ぶと localStorage の最新 rootBlock と version を反映して banner を閉じる", async () => {
    const latestRootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("latest")]),
    );

    persistenceMock.loadBrowserEditorState
      .mockReturnValueOnce({
        rootBlock: initialRootBlock,
        version: 2,
      })
      .mockReturnValueOnce({
        rootBlock: latestRootBlock,
        version: 3,
      });

    render(<App />);

    fireEvent(document, new Event("visibilitychange"));
    fireEvent.click(await screen.findByRole("button", { name: "再読込" }));

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
    });
    expect(setEditorSessionMock).toHaveBeenCalledWith(null);
    expect(setRootBlockMock).toHaveBeenCalledWith(latestRootBlock);
  });

  it("[OE-STORAGE-009] 保存競合の banner でこのまま続けるを選ぶと次の 1 回だけ競合チェックをスキップして保存できる状態にする", async () => {
    const nextRootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("next")]),
    );

    persistenceMock.loadBrowserEditorState.mockReturnValue({
      rootBlock: initialRootBlock,
      version: 2,
    });
    persistenceMock.persistBrowserEditorState.mockReturnValue({
      status: "saved",
      persistedState: {
        rootBlock: nextRootBlock,
        version: 3,
      },
    });

    render(<App />);

    fireEvent(document, new Event("visibilitychange"));
    fireEvent.click(
      await screen.findByRole("button", { name: "このまま続ける" }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
    });

    setPersistedRootBlock(nextRootBlock);

    await waitFor(() => {
      expect(persistenceMock.persistBrowserEditorState).toHaveBeenCalledWith(
        nextRootBlock,
        1,
        { skipConflictCheck: true },
      );
    });
  });

  it("このまま続けるの後にさらに新しい競合を検知したら、前回の 1 回分スキップは無効にする", async () => {
    const nextRootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("next")]),
    );

    persistenceMock.loadBrowserEditorState
      .mockReturnValueOnce({
        rootBlock: initialRootBlock,
        version: 2,
      })
      .mockReturnValueOnce({
        rootBlock: initialRootBlock,
        version: 3,
      });

    render(<App />);

    fireEvent(document, new Event("visibilitychange"));
    fireEvent.click(
      await screen.findByRole("button", { name: "このまま続ける" }),
    );

    await waitFor(() => {
      expect(screen.queryByRole("alert")).toBeNull();
    });

    fireEvent(document, new Event("visibilitychange"));
    await screen.findByRole("alert");

    setPersistedRootBlock(nextRootBlock);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    expect(persistenceMock.persistBrowserEditorState).not.toHaveBeenCalled();
  });
});
