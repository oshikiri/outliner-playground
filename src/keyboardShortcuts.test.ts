import { describe, expect, it, vi } from "vitest";

import { handleGlobalEditorKeydown } from "./keyboardShortcuts";

describe("グローバルショートカット", () => {
  it("[OE-RESET-001] Ctrl+K で rootBlock と editorSession を初期状態へ戻す", () => {
    const resetRootBlock = vi.fn();
    const resetEditorSession = vi.fn();
    const preventDefault = vi.fn();

    handleGlobalEditorKeydown(
      {
        key: "k",
        ctrlKey: true,
        preventDefault,
      } as Pick<KeyboardEvent, "ctrlKey" | "key" | "preventDefault">,
      {
        resetRootBlock,
        resetEditorSession,
      },
    );

    expect(resetRootBlock).toHaveBeenCalledOnce();
    expect(resetEditorSession).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it("Ctrl+K 以外では何もしない", () => {
    const resetRootBlock = vi.fn();
    const resetEditorSession = vi.fn();
    const preventDefault = vi.fn();

    handleGlobalEditorKeydown(
      {
        key: "j",
        ctrlKey: true,
        preventDefault,
      } as Pick<KeyboardEvent, "ctrlKey" | "key" | "preventDefault">,
      {
        resetRootBlock,
        resetEditorSession,
      },
    );

    expect(resetRootBlock).not.toHaveBeenCalled();
    expect(resetEditorSession).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });
});
