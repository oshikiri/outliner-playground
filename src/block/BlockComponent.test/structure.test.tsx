import { fireEvent, waitFor } from "@testing-library/preact";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BlockEntity from "../BlockEntity";
import {
  beginEditing,
  getCaretPositionState,
  getEditableTextboxes,
  getRootBlockState,
  renderEditor,
  renderRootBlock,
} from "./testUtils";

describe("ブロック分割", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("[OE-SPLIT-001][OE-SPLIT-002][OE-SPLIT-004] Enter で前半を現在ブロックに残し子がない場合は次の兄弟として分割する", async () => {
    renderEditor(["hello"]);

    const editable = await beginEditing("hello", {
      content: "hello",
      caretOffset: 2,
    });

    fireEvent.keyDown(editable, { key: "Enter" });

    await waitFor(() => {
      const rootBlock = getRootBlockState();
      expect(rootBlock.children).toHaveLength(2);
      expect(rootBlock.children[0]?.content).toBe("he");
      expect(rootBlock.children[1]?.content).toBe("llo");
      expect(getCaretPositionState()).toEqual({
        blockId: rootBlock.children[1]?.id,
        caretOffset: 0,
      });

      const nextEditable = getEditableTextboxes();
      expect(nextEditable).toHaveLength(1);
      expect(nextEditable[0]?.textContent).toBe("llo");
    });
  });

  it("[OE-IME-001] IME 変換中の Enter ではブロック分割しない", async () => {
    renderEditor(["hello"]);

    const editable = await beginEditing("hello", {
      content: "hello",
      caretOffset: 2,
    });

    const eventNotCanceled = fireEvent.keyDown(editable, {
      key: "Enter",
      isComposing: true,
    });

    expect(eventNotCanceled).toBe(true);

    await waitFor(() => {
      const rootBlock = getRootBlockState();
      expect(rootBlock.children).toHaveLength(1);
      expect(rootBlock.children[0]?.content).toBe("hello");
      expect(getCaretPositionState()).toEqual({
        blockId: rootBlock.children[0]?.id,
        caretOffset: 0,
      });
      expect(getEditableTextboxes()[0]?.textContent).toBe("hello");
    });
  });

  it("[OE-SPLIT-001][OE-SPLIT-002][OE-SPLIT-003] Enter で前半を現在ブロックに残し子がある場合は先頭の子ブロックとして分割する", async () => {
    const child = new BlockEntity("child");
    const target = new BlockEntity("hello", [child]);
    renderRootBlock(new BlockEntity("", [target]));

    const editable = await beginEditing("hello", {
      content: "hello",
      caretOffset: 2,
    });

    fireEvent.keyDown(editable, { key: "Enter" });

    await waitFor(() => {
      const rootBlock = getRootBlockState();
      expect(rootBlock.children).toHaveLength(1);
      expect(rootBlock.children[0]?.content).toBe("he");
      expect(
        rootBlock.children[0]?.children.map((block) => block.content),
      ).toEqual(["llo", "child"]);
      expect(getCaretPositionState()).toEqual({
        blockId: rootBlock.children[0]?.children[0]?.id,
        caretOffset: 0,
      });

      const nextEditable = getEditableTextboxes();
      expect(nextEditable).toHaveLength(1);
      expect(nextEditable[0]?.textContent).toBe("llo");
    });
  });
});

describe("ブロック結合", () => {
  it("[OE-JOIN-001][OE-JOIN-003][OE-JOIN-004] 行頭 Backspace でひとつ上のブロック末尾へ結合し結合元を削除する", async () => {
    renderEditor(["first", "second"]);

    const editable = await beginEditing("second", {
      content: "second",
      caretOffset: 0,
    });

    fireEvent.keyDown(editable, { key: "Backspace" });

    await waitFor(() => {
      const rootBlock = getRootBlockState();
      expect(rootBlock.children).toHaveLength(1);
      expect(rootBlock.children[0]?.content).toBe("firstsecond");
      expect(getCaretPositionState()).toEqual({
        blockId: rootBlock.children[0]?.id,
        caretOffset: "first".length,
      });

      const nextEditable = getEditableTextboxes();
      expect(nextEditable).toHaveLength(1);
      expect(nextEditable[0]?.textContent).toBe("firstsecond");
    });
  });

  it("[OE-JOIN-002] ひとつ上のブロックは pre-order depth-first 走査で直前のブロックとする", async () => {
    const grandchild = new BlockEntity("grandchild");
    const previous = new BlockEntity("previous", [grandchild]);
    const target = new BlockEntity("target");
    renderRootBlock(new BlockEntity("", [previous, target]));

    const editable = await beginEditing("target", {
      content: "target",
      caretOffset: 0,
    });

    fireEvent.keyDown(editable, { key: "Backspace" });

    await waitFor(() => {
      const rootBlock = getRootBlockState();
      expect(rootBlock.children).toHaveLength(1);
      expect(rootBlock.children[0]?.content).toBe("previous");
      expect(
        rootBlock.children[0]?.children.map((block) => block.content),
      ).toEqual(["grandchildtarget"]);
      expect(getCaretPositionState()).toEqual({
        blockId: rootBlock.children[0]?.children[0]?.id,
        caretOffset: "grandchild".length,
      });

      const nextEditable = getEditableTextboxes();
      expect(nextEditable).toHaveLength(1);
      expect(nextEditable[0]?.textContent).toBe("grandchildtarget");
    });
  });

  it("[OE-JOIN-005] 子ブロックを持つ場合は Backspace 結合が発火しない", async () => {
    const child = new BlockEntity("child");
    const target = new BlockEntity("target", [child]);
    renderRootBlock(new BlockEntity("", [target]));

    const editable = await beginEditing("target", {
      content: "target",
      caretOffset: 0,
    });

    fireEvent.keyDown(editable, { key: "Backspace" });

    await waitFor(() => {
      const rootBlock = getRootBlockState();
      expect(rootBlock.children).toHaveLength(1);
      expect(rootBlock.children[0]?.content).toBe("target");
      expect(
        rootBlock.children[0]?.children.map((block) => block.content),
      ).toEqual(["child"]);
      expect(getCaretPositionState()).toEqual({
        blockId: rootBlock.children[0]?.id,
        caretOffset: 0,
      });

      const nextEditable = getEditableTextboxes();
      expect(nextEditable).toHaveLength(1);
      expect(nextEditable[0]?.textContent).toBe("target");
    });
  });
});

describe("階層操作", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("[OE-INDENT-001][OE-INDENT-003] Tab で前の兄弟ブロックの子としてインデントし編集モードと focus を維持する", async () => {
    renderEditor(["first", "target"]);

    const editable = await beginEditing("target", {
      content: "target",
      caretOffset: 2,
    });
    editable.focus();

    fireEvent.keyDown(editable, { key: "Tab" });

    await waitFor(() => {
      const rootBlock = getRootBlockState();
      expect(rootBlock.children).toHaveLength(1);
      expect(rootBlock.children[0]?.content).toBe("first");
      expect(rootBlock.children[0]?.children[0]?.content).toBe("target");
      expect(getCaretPositionState()).toEqual({
        blockId: rootBlock.children[0]?.children[0]?.id,
        caretOffset: 2,
      });
      const nextEditable = getEditableTextboxes();
      expect(nextEditable).toHaveLength(1);
      expect(nextEditable[0]?.textContent).toBe("target");
      expect(document.activeElement).toBe(nextEditable[0]);
    });
  });

  it("[OE-INDENT-002] Tab で先頭の兄弟ブロックはインデントしない", async () => {
    renderEditor(["first", "second"]);

    const editable = await beginEditing("first", {
      content: "first",
      caretOffset: 1,
    });

    fireEvent.keyDown(editable, { key: "Tab" });

    await waitFor(() => {
      const rootBlock = getRootBlockState();
      expect(rootBlock.children.map((block) => block.content)).toEqual([
        "first",
        "second",
      ]);
      expect(getCaretPositionState()).toEqual({
        blockId: rootBlock.children[0]?.id,
        caretOffset: 1,
      });
      expect(getEditableTextboxes()[0]?.textContent).toBe("first");
    });
  });

  it("[OE-IME-002] IME 変換由来の keyCode 229 では Tab の階層操作を発火しない", async () => {
    renderEditor(["first", "target"]);

    const editable = await beginEditing("target", {
      content: "target",
      caretOffset: 2,
    });

    const eventNotCanceled = fireEvent.keyDown(editable, {
      key: "Tab",
      keyCode: 229,
      which: 229,
    });

    expect(eventNotCanceled).toBe(true);

    await waitFor(() => {
      const rootBlock = getRootBlockState();
      expect(rootBlock.children.map((block) => block.content)).toEqual([
        "first",
        "target",
      ]);
      expect(getCaretPositionState()).toEqual({
        blockId: rootBlock.children[1]?.id,
        caretOffset: 0,
      });
      expect(getEditableTextboxes()[0]?.textContent).toBe("target");
    });
  });

  it("[OE-OUTDENT-001][OE-OUTDENT-002][OE-OUTDENT-004] Shift+Tab で親の直後へ移動し後続兄弟を子として吸収し編集モードと focus を維持する", async () => {
    const first = new BlockEntity("first");
    const grandchild = new BlockEntity("grandchild");
    const target = new BlockEntity("target", [grandchild]);
    const trailing = new BlockEntity("trailing");
    const parent = new BlockEntity("parent", [first, target, trailing]);
    renderRootBlock(new BlockEntity("", [parent]));

    const editable = await beginEditing("target", {
      content: "target",
      caretOffset: 3,
    });
    editable.focus();

    fireEvent.keyDown(editable, { key: "Tab", shiftKey: true });

    await waitFor(() => {
      const rootBlock = getRootBlockState();
      expect(rootBlock.children.map((block) => block.content)).toEqual([
        "parent",
        "target",
      ]);
      expect(
        rootBlock.children[0]?.children.map((block) => block.content),
      ).toEqual(["first"]);
      expect(
        rootBlock.children[1]?.children.map((block) => block.content),
      ).toEqual(["grandchild", "trailing"]);
      expect(getCaretPositionState()).toEqual({
        blockId: rootBlock.children[1]?.id,
        caretOffset: 3,
      });
      const nextEditable = getEditableTextboxes();
      expect(nextEditable).toHaveLength(1);
      expect(nextEditable[0]?.textContent).toBe("target");
      expect(document.activeElement).toBe(nextEditable[0]);
    });
  });

  it("[OE-OUTDENT-003] Shift+Tab で hidden root 直下のブロックはアウトデントしない", async () => {
    renderEditor(["first"]);

    const editable = await beginEditing("first", {
      content: "first",
      caretOffset: 2,
    });

    fireEvent.keyDown(editable, { key: "Tab", shiftKey: true });

    await waitFor(() => {
      const rootBlock = getRootBlockState();
      expect(rootBlock.children.map((block) => block.content)).toEqual([
        "first",
      ]);
      expect(getCaretPositionState()).toEqual({
        blockId: rootBlock.children[0]?.id,
        caretOffset: 2,
      });
      expect(getEditableTextboxes()[0]?.textContent).toBe("first");
    });
  });
});
