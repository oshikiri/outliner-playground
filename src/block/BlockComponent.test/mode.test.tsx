import { fireEvent, screen, waitFor } from "@testing-library/preact";
import { describe, expect, it, vi } from "vitest";

import BlockEntity from "../BlockEntity";
import {
  beginEditing,
  getCaretPositionState,
  getEditableTextboxes,
  getRootBlockState,
  initializeRootBlockState,
  renderBlurFallbackHarness,
  renderRootBlock,
  renderEditor,
  setCaretPositionState,
  waitForEditableTextbox,
} from "./testUtils";

describe("編集モード/表示モード", () => {
  it("[OE-TREE-001] hidden root は画面に表示しない", () => {
    const rootBlock = new BlockEntity("hidden-root", [
      new BlockEntity("first"),
      new BlockEntity("second"),
    ]);

    renderRootBlock(rootBlock);

    expect(screen.queryByText("hidden-root")).toBeNull();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.getByText("first")).toBeTruthy();
    expect(screen.getByText("second")).toBeTruthy();
  });

  it("[OE-MODE-001][OE-MODE-005] 表示モードのブロックをクリックすると編集モードに遷移する", async () => {
    renderEditor(["first", "second"]);

    const editable = await beginEditing("first");

    expect(editable.textContent).toBe("first");
  });

  it("[OE-MODE-002][OE-MODE-005] 別のブロックをクリックすると編集対象が切り替わる", async () => {
    renderEditor(["first", "second"]);

    await beginEditing("first");
    const editable = await beginEditing("second");

    expect(editable.textContent).toBe("second");
  });

  it("[OE-MODE-004] 外側へフォーカスが移ると変更を保存して表示モードに戻る", async () => {
    renderEditor(["first"]);

    const editable = await beginEditing("first", { content: "updated" });

    const outside = screen.getByRole("button", { name: "outside" });
    outside.focus();
    fireEvent.blur(editable);
    fireEvent.click(outside);

    await waitFor(() => {
      expect(getEditableTextboxes()).toHaveLength(0);
      expect(screen.getByText("updated")).toBeTruthy();
    });
  });

  it("[OE-MODE-004] blur 時に ref から DOM が外れていても変更を保存して表示モードに戻る", async () => {
    const target = new BlockEntity("first");
    const rootBlock = new BlockEntity("", [target]);
    const refs: {
      contentRef: { current: HTMLDivElement | null } | null;
    } = {
      contentRef: null,
    };

    initializeRootBlockState(rootBlock);
    setCaretPositionState({ blockId: target.id, caretOffset: 0 });
    renderBlurFallbackHarness(target, (contentRef) => {
      refs.contentRef = contentRef;
    });

    const editable = await waitForEditableTextbox("first");
    editable.innerText = "updated";

    if (!refs.contentRef) {
      throw new Error("contentRef was not captured.");
    }
    refs.contentRef.current = null;

    const outside = screen.getByRole("button", { name: "outside" });
    outside.focus();
    fireEvent.blur(editable);

    await waitFor(() => {
      expect(getCaretPositionState()).toBeNull();
      expect(getRootBlockState().children[0]?.content).toBe("updated");
      expect(getEditableTextboxes()).toHaveLength(0);
    });
  });

  it("[OE-MODE-006] 表示モードのブロックをクリックするとクリック位置に最も近い箇所へキャレットを置く", async () => {
    renderEditor(["first"]);

    const range = document.createRange();
    const displayBlock = screen.getByText("first").closest('[role="textbox"]');
    if (!(displayBlock instanceof HTMLDivElement)) {
      throw new Error("display block was not found.");
    }
    const textNode = displayBlock.firstChild;
    if (!textNode) {
      throw new Error("display block text node was not found.");
    }

    range.setStart(textNode, 3);
    range.setEnd(textNode, 3);
    Object.defineProperty(document, "caretRangeFromPoint", {
      configurable: true,
      value: vi.fn(() => range),
    });

    await beginEditing("first", {
      clickEventInit: { clientX: 12, clientY: 8 },
    });

    expect(getCaretPositionState()).toEqual({
      blockId: getRootBlockState().children[0]?.id,
      caretOffset: 3,
    });
  });
});
