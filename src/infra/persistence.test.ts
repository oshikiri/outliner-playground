import { beforeEach, describe, expect, it, vi } from "vitest";

import BlockEntity from "../core/block/BlockEntity";
import {
  createBlockStore,
  createBlockTreeLike,
  updateBlockContent,
} from "../core/block/blockStore";
import { createBlockTree } from "../core/block/blockStoreEntity";
import {
  loadBrowserEditorState,
  loadPersistedEditorState,
  persistEditorState,
} from "./persistence";

const STORAGE_KEY = "outliner-playground.rootBlock";

function createPersistedPayload(
  rootBlock: ReturnType<typeof createBlockStore>,
  version: number,
): string {
  return JSON.stringify({
    rootBlock: createBlockTreeLike(rootBlock),
    version,
  });
}

describe("永続化", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("[OE-STORAGE-001] 起動時に保存済みデータがあれば rootBlock と version を初期データより優先して読み込む", () => {
    const fallbackRootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("fallback")]),
    );
    const persistedRootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("persisted")]),
    );

    const restored = loadPersistedEditorState(
      {
        getItem: vi.fn().mockReturnValue(
          JSON.stringify({
            rootBlock: createBlockTreeLike(persistedRootBlock),
            version: 3,
          }),
        ),
      },
      fallbackRootBlock,
    );

    expect(createBlockTree(restored.rootBlock).children[0]?.content).toBe(
      "persisted",
    );
    expect(restored.rootBlock.rootId).toBe(persistedRootBlock.rootId);
    expect(restored.version).toBe(3);
  });

  it("[OE-STORAGE-002] 保存要求が成功したとき rootBlock と version を localStorage に保存する", () => {
    const rootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("persisted")]),
    );
    const getItem = vi
      .fn()
      .mockReturnValue(createPersistedPayload(rootBlock, 0));
    const setItem = vi.fn();

    const result = persistEditorState({ getItem, setItem }, rootBlock, 0);

    expect(result).toEqual({
      status: "saved",
      persistedState: {
        rootBlock,
        version: 1,
      },
    });
    expect(setItem).toHaveBeenCalledOnce();
    expect(setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify({
        rootBlock: createBlockTreeLike(rootBlock),
        version: 1,
      }),
    );
  });

  it("browser 用 load API は localStorage と fallback tree をまとめて扱う", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockReturnValue(
      JSON.stringify({
        rootBlock: createBlockTreeLike(
          createBlockStore(new BlockEntity("", [new BlockEntity("saved")])),
        ),
        version: 2,
      }),
    );

    const restored = loadBrowserEditorState(
      new BlockEntity("", [new BlockEntity("fallback")]),
    );

    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(createBlockTree(restored.rootBlock).children[0]?.content).toBe(
      "saved",
    );
    expect(restored.version).toBe(2);
  });

  it("旧保存形式の rootBlock も version 0 として復元できる", () => {
    const rootBlock = createBlockStore(new BlockEntity(""));

    const restored = loadPersistedEditorState(
      {
        getItem: vi
          .fn()
          .mockReturnValue(JSON.stringify(createBlockTreeLike(rootBlock))),
      },
      createBlockStore(new BlockEntity("", [new BlockEntity("fallback")])),
    );

    expect(createBlockTree(restored.rootBlock).children).toHaveLength(0);
    expect(restored.rootBlock.rootId).toBe(rootBlock.rootId);
    expect(restored.version).toBe(0);
  });

  it("[OE-COLLAPSE-005] 起動時に保存済み collapsed があれば復元する", () => {
    const rootBlock = createBlockStore(
      new BlockEntity("", [
        new BlockEntity("parent", [new BlockEntity("child")], true),
      ]),
    );

    const restored = loadPersistedEditorState(
      {
        getItem: vi.fn().mockReturnValue(
          JSON.stringify({
            rootBlock: createBlockTreeLike(rootBlock),
            version: 1,
          }),
        ),
      },
      rootBlock,
    );

    expect(createBlockTree(restored.rootBlock).children[0]?.collapsed).toBe(
      true,
    );
  });

  it("[OE-COLLAPSE-004] collapsed が更新されたら localStorage に保存する", () => {
    const rootBlock = createBlockStore(
      new BlockEntity("", [
        new BlockEntity("parent", [new BlockEntity("child")], true),
      ]),
    );
    const getItem = vi
      .fn()
      .mockReturnValue(createPersistedPayload(rootBlock, 4));
    const setItem = vi.fn();

    persistEditorState({ getItem, setItem }, rootBlock, 4);

    expect(setItem).toHaveBeenCalledOnce();
    expect(setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify({
        rootBlock: createBlockTreeLike(rootBlock),
        version: 5,
      }),
    );
  });

  it("browser 用 load API は collapsed もまとめて localStorage から読む", () => {
    const rootBlock = createBlockStore(
      new BlockEntity("", [
        new BlockEntity("parent", [new BlockEntity("child")], true),
      ]),
    );
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockReturnValue(
      JSON.stringify({
        rootBlock: createBlockTreeLike(rootBlock),
        version: 6,
      }),
    );

    const restored = loadBrowserEditorState(rootBlock);

    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(createBlockTree(restored.rootBlock).children[0]?.collapsed).toBe(
      true,
    );
    expect(restored.version).toBe(6);
  });

  it("編集中ドラフトがあれば保存対象に反映する", () => {
    const rootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("committed")]),
    );
    const activeBlock = createBlockTree(rootBlock).children[0];
    if (!activeBlock) {
      throw new Error("Expected an active block.");
    }

    const persisted = updateBlockContent(rootBlock, activeBlock.id, "draft");

    expect(createBlockTree(persisted).children[0]?.content).toBe("draft");
    expect(createBlockTree(rootBlock).children[0]?.content).toBe("committed");
  });

  it("[OE-STORAGE-003] 保存内容が壊れている場合は初期データへフォールバックする", () => {
    const fallbackRootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("fallback")]),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const restored = loadPersistedEditorState(
      {
        getItem: vi.fn().mockReturnValue("{broken"),
      },
      fallbackRootBlock,
    );

    expect(restored.rootBlock).toBe(fallbackRootBlock);
    expect(restored.version).toBe(0);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("[OE-STORAGE-003] root 用として壊れた形状なら初期データへフォールバックする", () => {
    const fallbackRootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("fallback")]),
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const restored = loadPersistedEditorState(
      {
        getItem: vi.fn().mockReturnValue(JSON.stringify({ broken: true })),
      },
      fallbackRootBlock,
    );

    expect(restored.rootBlock).toBe(fallbackRootBlock);
    expect(restored.version).toBe(0);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("[OE-STORAGE-004] 保存要求時は保存前に localStorage の最新データを再読込する", () => {
    const rootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("persisted")]),
    );
    const getItem = vi
      .fn()
      .mockReturnValue(createPersistedPayload(rootBlock, 1));
    const setItem = vi.fn();

    persistEditorState({ getItem, setItem }, rootBlock, 1);

    expect(getItem.mock.invocationCallOrder[0]).toBeLessThan(
      setItem.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
  });

  it("[OE-STORAGE-005] 保存前に再読込した version が最後に読んだ値と一致する場合だけ version を 1 増やして localStorage を更新する", () => {
    const rootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("persisted")]),
    );
    const setItem = vi.fn();

    const result = persistEditorState(
      {
        getItem: vi.fn().mockReturnValue(createPersistedPayload(rootBlock, 7)),
        setItem,
      },
      rootBlock,
      7,
    );

    expect(result).toEqual({
      status: "saved",
      persistedState: {
        rootBlock,
        version: 8,
      },
    });
    expect(setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify({
        rootBlock: createBlockTreeLike(rootBlock),
        version: 8,
      }),
    );
  });

  it("[OE-STORAGE-006] 保存前に再読込した version が最後に読んだ値と一致しない場合は競合として localStorage を更新しない", () => {
    const localRootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("local")]),
    );
    const latestRootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("latest")]),
    );
    const setItem = vi.fn();

    const result = persistEditorState(
      {
        getItem: vi
          .fn()
          .mockReturnValue(createPersistedPayload(latestRootBlock, 2)),
        setItem,
      },
      localRootBlock,
      1,
    );

    expect(result).toEqual({
      status: "conflict",
      latestState: {
        rootBlock: latestRootBlock,
        version: 2,
      },
    });
    expect(setItem).not.toHaveBeenCalled();
  });
});
