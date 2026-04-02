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
  persistBrowserEditorState,
  persistEditorState,
} from "./persistence";

const STORAGE_KEY = "outliner-playground.rootBlock";

describe("永続化", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("[OE-STORAGE-001] 起動時に保存済み rootBlock があればそれを初期データより優先して読み込む", () => {
    const fallbackRootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("fallback")]),
    );
    const persistedRootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("persisted")]),
    );

    const restored = loadPersistedEditorState(
      {
        getItem: vi
          .fn()
          .mockReturnValue(
            JSON.stringify(createBlockTreeLike(persistedRootBlock)),
          ),
      },
      fallbackRootBlock,
    );

    expect(createBlockTree(restored).children[0]?.content).toBe("persisted");
    expect(restored.rootId).toBe(persistedRootBlock.rootId);
  });

  it("[OE-STORAGE-002] rootBlock が更新されたら localStorage に保存する", () => {
    const setItem = vi.fn();
    const rootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("persisted")]),
    );

    persistEditorState({ setItem }, rootBlock);

    expect(setItem).toHaveBeenCalledOnce();
    expect(setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(createBlockTreeLike(rootBlock)),
    );
  });

  it("browser 用 load API は localStorage と fallback tree をまとめて扱う", () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockReturnValue(
        JSON.stringify(
          createBlockTreeLike(
            createBlockStore(new BlockEntity("", [new BlockEntity("saved")])),
          ),
        ),
      );

    const restored = loadBrowserEditorState(
      new BlockEntity("", [new BlockEntity("fallback")]),
    );

    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(createBlockTree(restored).children[0]?.content).toBe("saved");
  });

  it("子を持たない rootBlock も保存内容から復元できる", () => {
    const rootBlock = createBlockStore(new BlockEntity(""));

    const restored = loadPersistedEditorState(
      {
        getItem: vi
          .fn()
          .mockReturnValue(JSON.stringify(createBlockTreeLike(rootBlock))),
      },
      createBlockStore(new BlockEntity("", [new BlockEntity("fallback")])),
    );

    expect(createBlockTree(restored).children).toHaveLength(0);
    expect(restored.rootId).toBe(rootBlock.rootId);
  });

  it("[OE-COLLAPSE-005] 起動時に保存済み collapsed があれば復元する", () => {
    const rootBlock = createBlockStore(
      new BlockEntity("", [
        new BlockEntity("parent", [new BlockEntity("child")], true),
      ]),
    );

    const restored = loadPersistedEditorState(
      {
        getItem: vi
          .fn()
          .mockReturnValue(JSON.stringify(createBlockTreeLike(rootBlock))),
      },
      rootBlock,
    );

    expect(createBlockTree(restored).children[0]?.collapsed).toBe(true);
  });

  it("browser 用 persist API は localStorage への保存を隠蔽する", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {});
    const rootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("persisted")]),
    );

    persistBrowserEditorState(rootBlock);

    expect(setItem).toHaveBeenCalledOnce();
    expect(setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(createBlockTreeLike(rootBlock)),
    );
  });

  it("[OE-COLLAPSE-004] collapsed が更新されたら localStorage に保存する", () => {
    const setItem = vi.fn();
    const rootBlock = createBlockStore(
      new BlockEntity("", [
        new BlockEntity("parent", [new BlockEntity("child")], true),
      ]),
    );

    persistEditorState({ setItem }, rootBlock);

    expect(setItem).toHaveBeenCalledOnce();
    expect(setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(createBlockTreeLike(rootBlock)),
    );
  });

  it("browser 用 load API は collapsed もまとめて localStorage から読む", () => {
    const rootBlock = createBlockStore(
      new BlockEntity("", [
        new BlockEntity("parent", [new BlockEntity("child")], true),
      ]),
    );
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockReturnValue(JSON.stringify(createBlockTreeLike(rootBlock)));

    const restored = loadBrowserEditorState(rootBlock);

    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(createBlockTree(restored).children[0]?.collapsed).toBe(true);
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

    expect(restored).toBe(fallbackRootBlock);
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

    expect(restored).toBe(fallbackRootBlock);
    expect(warn).toHaveBeenCalledOnce();
  });
});
