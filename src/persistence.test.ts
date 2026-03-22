import { beforeEach, describe, expect, it, vi } from "vitest";

import BlockEntity, { createBlock } from "./block/BlockEntity";
import {
  loadPersistedRootBlock,
  persistRootBlock,
  resolvePersistedRootBlock,
} from "./persistence";

const STORAGE_KEY = "outliner-playground.rootBlock";

describe("永続化", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("[OE-STORAGE-001] 起動時に保存済み rootBlock があればそれを初期データより優先して読み込む", () => {
    const fallbackRootBlock = new BlockEntity("", [
      new BlockEntity("fallback"),
    ]);
    const persistedRootBlock = createBlock(
      new BlockEntity("", [new BlockEntity("persisted")]).toJSON(),
    );

    const restored = loadPersistedRootBlock(
      {
        getItem: vi
          .fn()
          .mockReturnValue(JSON.stringify(persistedRootBlock.toJSON())),
      },
      fallbackRootBlock,
    );

    expect(restored.children[0]?.content).toBe("persisted");
    expect(restored.id).toBe(persistedRootBlock.id);
  });

  it("[OE-STORAGE-002] rootBlock が更新されたら localStorage に保存する", () => {
    const setItem = vi.fn();
    const rootBlock = new BlockEntity("", [new BlockEntity("persisted")]);

    persistRootBlock({ setItem }, rootBlock);

    expect(setItem).toHaveBeenCalledOnce();
    expect(setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(rootBlock.toJSON()),
    );
  });

  it("編集中ドラフトがあれば保存対象に反映する", () => {
    const rootBlock = new BlockEntity("", [new BlockEntity("committed")]);
    const activeBlock = rootBlock.children[0];
    if (!activeBlock) {
      throw new Error("Expected an active block.");
    }

    const persisted = resolvePersistedRootBlock(rootBlock, {
      activeBlockId: activeBlock.id,
      caretOffset: "draft".length,
      draftText: "draft",
    });

    expect(persisted.children[0]?.content).toBe("draft");
    expect(rootBlock.children[0]?.content).toBe("committed");
  });

  it("[OE-STORAGE-003] 保存内容が壊れている場合は初期データへフォールバックする", () => {
    const fallbackRootBlock = new BlockEntity("", [
      new BlockEntity("fallback"),
    ]);
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
    const fallbackRootBlock = new BlockEntity("", [
      new BlockEntity("fallback"),
    ]);
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
