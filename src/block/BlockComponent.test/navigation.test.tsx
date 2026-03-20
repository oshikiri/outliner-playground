import { fireEvent, waitFor } from "@testing-library/preact";
import { describe, expect, it } from "vitest";

import {
  beginEditing,
  getCaretPositionState,
  getEditableTextboxes,
  getRootBlockState,
  renderEditor,
} from "./testUtils";

describe("キー移動", () => {
  it("[OE-MOVE-008] 1行だけのブロックで ArrowDown を押すと次のブロックを編集モードにする", async () => {
    renderEditor(["first", "second"]);

    const editable = await beginEditing("first", {
      caretOffset: "first".length,
    });

    fireEvent.keyDown(editable, { key: "ArrowDown" });

    await waitFor(() => {
      const nextEditable = getEditableTextboxes();
      expect(nextEditable).toHaveLength(1);
      expect(nextEditable[0]?.textContent).toBe("second");
      expect(getCaretPositionState()).toEqual({
        blockId: getRootBlockState().children[1]?.id,
        caretOffset: "first".length,
      });
    });
  });

  it("[OE-MOVE-005] 1行だけのブロックで ArrowUp を押すと前のブロックを編集モードにする", async () => {
    renderEditor(["first", "second"]);

    const editable = await beginEditing("second", { caretOffset: 0 });

    fireEvent.keyDown(editable, { key: "ArrowUp" });

    await waitFor(() => {
      const nextEditable = getEditableTextboxes();
      expect(nextEditable).toHaveLength(1);
      expect(nextEditable[0]?.textContent).toBe("first");
      expect(getCaretPositionState()).toEqual({
        blockId: getRootBlockState().children[0]?.id,
        caretOffset: 0,
      });
    });
  });

  it("[OE-MOVE-006] 複数行ブロックの最後の行で ArrowDown を押すと次のブロックを編集モードにする", async () => {
    renderEditor(["ab\ncd", "next"]);

    const editable = await beginEditing("ab\ncd", {
      content: "ab\ncd",
      caretOffset: 5,
    });

    fireEvent.keyDown(editable, { key: "ArrowDown" });

    await waitFor(() => {
      const nextEditable = getEditableTextboxes();
      expect(nextEditable).toHaveLength(1);
      expect(nextEditable[0]?.textContent).toBe("next");
      expect(getCaretPositionState()).toEqual({
        blockId: getRootBlockState().children[1]?.id,
        caretOffset: 2,
      });
    });
  });

  it("[OE-MOVE-006] 末尾改行の最終行で ArrowDown を押すと次のブロックを編集モードにする", async () => {
    renderEditor(["abc\n", "next"]);

    const editable = await beginEditing("abc\n", {
      content: "abc\n",
      caretOffset: 4,
    });

    fireEvent.keyDown(editable, { key: "ArrowDown" });

    await waitFor(() => {
      const nextEditable = getEditableTextboxes();
      expect(nextEditable).toHaveLength(1);
      expect(nextEditable[0]?.textContent).toBe("next");
      expect(getCaretPositionState()).toEqual({
        blockId: getRootBlockState().children[1]?.id,
        caretOffset: 0,
      });
    });
  });

  it("[OE-MOVE-009] 次ブロック先頭行が短い場合 ArrowDown 後の caretOffset は先頭行末尾にクランプされる", async () => {
    renderEditor(["ab\ncdef", "x\nyz"]);

    const editable = await beginEditing("ab\ncdef", {
      content: "ab\ncdef",
      caretOffset: 6,
    });

    fireEvent.keyDown(editable, { key: "ArrowDown" });

    await waitFor(() => {
      const nextEditable = getEditableTextboxes();
      expect(nextEditable).toHaveLength(1);
      expect(nextEditable[0]?.textContent).toBe("x\nyz");
      expect(getCaretPositionState()).toEqual({
        blockId: getRootBlockState().children[1]?.id,
        caretOffset: 1,
      });
    });
  });

  it("[OE-MOVE-006] 複数行ブロックの最初の行で ArrowUp を押すと前のブロックを編集モードにする", async () => {
    renderEditor(["prev", "ab\ncd"]);

    const editable = await beginEditing("ab\ncd", {
      content: "ab\ncd",
      caretOffset: 1,
    });

    fireEvent.keyDown(editable, { key: "ArrowUp" });

    await waitFor(() => {
      const nextEditable = getEditableTextboxes();
      expect(nextEditable).toHaveLength(1);
      expect(nextEditable[0]?.textContent).toBe("prev");
      expect(getCaretPositionState()).toEqual({
        blockId: getRootBlockState().children[0]?.id,
        caretOffset: 1,
      });
    });
  });

  it("[OE-MOVE-010] 前ブロックが末尾改行で終わるとき ArrowUp 後の caretOffset は空行先頭にクランプされる", async () => {
    renderEditor(["abc\n", "xy"]);

    const editable = await beginEditing("xy", {
      content: "xy",
      caretOffset: 1,
    });

    fireEvent.keyDown(editable, { key: "ArrowUp" });

    await waitFor(() => {
      const nextEditable = getEditableTextboxes();
      expect(nextEditable).toHaveLength(1);
      expect(nextEditable[0]?.textContent).toBe("abc\n");
      expect(getCaretPositionState()).toEqual({
        blockId: getRootBlockState().children[0]?.id,
        caretOffset: 4,
      });
    });
  });

  it("[OE-MOVE-007] 複数行ブロックの途中の行で ArrowDown を押すとブロック内移動に任せる", async () => {
    renderEditor(["ab\ncd\nef", "next"]);

    const editable = await beginEditing("ab\ncd\nef", {
      content: "ab\ncd\nef",
      caretOffset: 1,
    });

    const eventNotCanceled = fireEvent.keyDown(editable, { key: "ArrowDown" });

    expect(eventNotCanceled).toBe(true);
    expect(getEditableTextboxes()[0]?.textContent).toBe("ab\ncd\nef");
    expect(getCaretPositionState()).toEqual({
      blockId: getRootBlockState().children[0]?.id,
      caretOffset: 0,
    });
  });

  it("[OE-MOVE-007] 複数行ブロックの途中の行で ArrowUp を押すとブロック内移動に任せる", async () => {
    renderEditor(["ab\ncd\nef", "next"]);

    const editable = await beginEditing("ab\ncd\nef", {
      content: "ab\ncd\nef",
      caretOffset: 4,
    });

    const eventNotCanceled = fireEvent.keyDown(editable, { key: "ArrowUp" });

    expect(eventNotCanceled).toBe(true);
    expect(getEditableTextboxes()[0]?.textContent).toBe("ab\ncd\nef");
    expect(getCaretPositionState()).toEqual({
      blockId: getRootBlockState().children[0]?.id,
      caretOffset: 0,
    });
  });

  it("[OE-MODE-003][OE-MOVE-001] カーソルがブロック先頭にある場合は一つ前のブロック末尾に移動する", async () => {
    renderEditor(["first", "second"]);

    const editable = await beginEditing("second", { caretOffset: 0 });

    fireEvent.keyDown(editable, { key: "ArrowLeft" });

    await waitFor(() => {
      const nextEditable = getEditableTextboxes();
      expect(nextEditable).toHaveLength(1);
      expect(nextEditable[0]?.textContent).toBe("first");
      expect(getCaretPositionState()).toEqual({
        blockId: getRootBlockState().children[0]?.id,
        caretOffset: "first".length,
      });
    });
  });

  it("[OE-MOVE-002] カーソルがブロック末尾にある場合は一つ後のブロック先頭に移動する", async () => {
    renderEditor(["first", "second"]);

    const editable = await beginEditing("first", {
      caretOffset: "first".length,
    });

    fireEvent.keyDown(editable, { key: "ArrowRight" });

    await waitFor(() => {
      const nextEditable = getEditableTextboxes();
      expect(nextEditable).toHaveLength(1);
      expect(nextEditable[0]?.textContent).toBe("second");
      expect(getCaretPositionState()).toEqual({
        blockId: getRootBlockState().children[1]?.id,
        caretOffset: 0,
      });
    });
  });

  it("[OE-MOVE-003] Ctrl+A で現在行の行頭へ移動する", async () => {
    renderEditor(["ab\ncd"]);

    const editable = await beginEditing("ab\ncd", { caretOffset: 4 });

    fireEvent.keyDown(editable, { key: "a", ctrlKey: true });

    await waitFor(() => {
      expect(getCaretPositionState()).toEqual({
        blockId: getRootBlockState().children[0]?.id,
        caretOffset: 3,
      });
    });
  });

  it("[OE-MOVE-004] Ctrl+E で現在行の行末へ移動する", async () => {
    renderEditor(["ab\ncd"]);

    const editable = await beginEditing("ab\ncd", {
      content: "ab\ncd",
      caretOffset: 3,
    });

    fireEvent.keyDown(editable, { key: "e", ctrlKey: true });

    await waitFor(() => {
      expect(getCaretPositionState()).toEqual({
        blockId: getRootBlockState().children[0]?.id,
        caretOffset: 5,
      });
    });
  });
});
