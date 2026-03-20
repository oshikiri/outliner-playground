import { fireEvent, waitFor } from "@testing-library/preact";
import { describe, expect, it } from "vitest";

import BlockEntity from "../BlockEntity";
import {
  beginEditing,
  getCaretPositionState,
  getEditableTextboxes,
  getRootBlockState,
  renderEditor,
  renderRootBlock,
} from "./testUtils";

describe("ブロック順序変更", () => {
  it("[OE-REORDER-001] Ctrl+↑ で子孫を保ったまま一つ前の兄弟ブロックと位置を入れ替える", async () => {
    const first = new BlockEntity("first");
    const child = new BlockEntity("child");
    const target = new BlockEntity("target", [child]);
    renderRootBlock(new BlockEntity("", [first, target]));

    const editable = await beginEditing("target", {
      content: "target",
      caretOffset: 1,
    });

    fireEvent.keyDown(editable, { key: "ArrowUp", ctrlKey: true });

    await waitFor(() => {
      const rootBlock = getRootBlockState();
      expect(rootBlock.children.map((block) => block.content)).toEqual([
        "target",
        "first",
      ]);
      expect(rootBlock.children[0]?.children[0]?.content).toBe("child");
      expect(getCaretPositionState()).toEqual({
        blockId: rootBlock.children[0]?.id,
        caretOffset: 1,
      });
      expect(getEditableTextboxes()[0]?.textContent).toBe("target");
    });
  });

  it("[OE-REORDER-002] Ctrl+↑ で先頭の兄弟ブロックは移動しない", async () => {
    renderEditor(["first", "second"]);

    const editable = await beginEditing("first", {
      content: "first",
      caretOffset: 2,
    });

    fireEvent.keyDown(editable, { key: "ArrowUp", ctrlKey: true });

    await waitFor(() => {
      const rootBlock = getRootBlockState();
      expect(rootBlock.children.map((block) => block.content)).toEqual([
        "first",
        "second",
      ]);
      expect(getCaretPositionState()).toEqual({
        blockId: rootBlock.children[0]?.id,
        caretOffset: 2,
      });
      expect(getEditableTextboxes()[0]?.textContent).toBe("first");
    });
  });

  it("[OE-REORDER-003] Ctrl+↓ で子孫を保ったまま一つ後の兄弟ブロックと位置を入れ替える", async () => {
    const child = new BlockEntity("child");
    const target = new BlockEntity("target", [child]);
    const second = new BlockEntity("second");
    renderRootBlock(new BlockEntity("", [target, second]));

    const editable = await beginEditing("target", {
      content: "target",
      caretOffset: 3,
    });

    fireEvent.keyDown(editable, { key: "ArrowDown", ctrlKey: true });

    await waitFor(() => {
      const rootBlock = getRootBlockState();
      expect(rootBlock.children.map((block) => block.content)).toEqual([
        "second",
        "target",
      ]);
      expect(rootBlock.children[1]?.children[0]?.content).toBe("child");
      expect(getCaretPositionState()).toEqual({
        blockId: rootBlock.children[1]?.id,
        caretOffset: 3,
      });
      expect(getEditableTextboxes()[0]?.textContent).toBe("target");
    });
  });

  it("[OE-REORDER-004] Ctrl+↓ で末尾の兄弟ブロックは移動しない", async () => {
    renderEditor(["first", "second"]);

    const editable = await beginEditing("second", {
      content: "second",
      caretOffset: 4,
    });

    fireEvent.keyDown(editable, { key: "ArrowDown", ctrlKey: true });

    await waitFor(() => {
      const rootBlock = getRootBlockState();
      expect(rootBlock.children.map((block) => block.content)).toEqual([
        "first",
        "second",
      ]);
      expect(getCaretPositionState()).toEqual({
        blockId: rootBlock.children[1]?.id,
        caretOffset: 4,
      });
      expect(getEditableTextboxes()[0]?.textContent).toBe("second");
    });
  });
});
