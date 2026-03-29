import { beforeEach, describe, expect, it, vi } from "vitest";

import BlockEntity from "../core/block/BlockEntity";
import {
  createBlockStore,
  createBlockTreeLike,
  updateBlockContent,
} from "../core/block/blockStore";
import { createBlockTree } from "../core/block/blockStoreEntity";
import {
  loadBrowserRootBlock,
  loadPersistedRootBlock,
  persistBrowserRootBlock,
  persistRootBlock,
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

    const restored = loadPersistedRootBlock(
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

    persistRootBlock({ setItem }, rootBlock);

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

    const restored = loadBrowserRootBlock(
      new BlockEntity("", [new BlockEntity("fallback")]),
    );

    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(createBlockTree(restored).children[0]?.content).toBe("saved");
  });

  it("browser 用 persist API は localStorage への保存を隠蔽する", () => {
    const setItem = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {});
    const rootBlock = createBlockStore(
      new BlockEntity("", [new BlockEntity("persisted")]),
    );

    persistBrowserRootBlock(rootBlock);

    expect(setItem).toHaveBeenCalledOnce();
    expect(setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(createBlockTreeLike(rootBlock)),
    );
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

    const restored = loadPersistedRootBlock(
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

    const restored = loadPersistedRootBlock(
      {
        getItem: vi
          .fn()
          .mockReturnValue(JSON.stringify({ id: "x", content: "orphan" })),
      },
      fallbackRootBlock,
    );

    expect(restored).toBe(fallbackRootBlock);
    expect(warn).toHaveBeenCalledOnce();
  });
});
