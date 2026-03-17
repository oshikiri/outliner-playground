import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/preact";
import type { JSX } from "preact";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BlockComponent from "./BlockComponent";
import BlockEntity from "./BlockEntity";
import { initializeState, useRootBlock } from "../state";

let rootBlockState: unknown = null;
let caretPositionState: unknown = null;
const rootListeners = new Set<(value: unknown) => void>();
const caretListeners = new Set<(value: unknown) => void>();

vi.mock("../state", async () => {
  const hooks = await import("preact/hooks");

  const applyUpdate = <T,>(
    currentValue: T,
    update: T | ((prev: T) => T),
  ): T => {
    if (typeof update === "function") {
      return (update as (prev: T) => T)(currentValue);
    }
    return update;
  };

  return {
    initializeState(rootBlock: unknown): void {
      rootBlockState = rootBlock;
      caretPositionState = null;
      rootListeners.forEach((listener) => listener(rootBlockState));
      caretListeners.forEach((listener) => listener(caretPositionState));
    },
    useRootBlock(): [
      unknown,
      (update: unknown | ((prev: unknown) => unknown)) => void,
    ] {
      const [value, setValue] = hooks.useState(rootBlockState);

      hooks.useEffect(() => {
        rootListeners.add(setValue);
        return () => rootListeners.delete(setValue);
      }, []);

      const updateValue = (
        update: unknown | ((prev: unknown) => unknown),
      ): void => {
        rootBlockState = applyUpdate(rootBlockState, update);
        rootListeners.forEach((listener) => listener(rootBlockState));
      };

      return [value, updateValue];
    },
    useCaretPosition(): [
      unknown,
      (update: unknown | ((prev: unknown) => unknown)) => void,
    ] {
      const [value, setValue] = hooks.useState(caretPositionState);

      hooks.useEffect(() => {
        caretListeners.add(setValue);
        return () => caretListeners.delete(setValue);
      }, []);

      const updateValue = (
        update: unknown | ((prev: unknown) => unknown),
      ): void => {
        caretPositionState = applyUpdate(caretPositionState, update);
        caretListeners.forEach((listener) => listener(caretPositionState));
      };

      return [value, updateValue];
    },
  };
});

afterEach(() => {
  cleanup();
  rootListeners.clear();
  caretListeners.clear();
  rootBlockState = null;
  caretPositionState = null;
  vi.restoreAllMocks();
});

describe("編集モード/表示モード", () => {
  it("[OE-TREE-001] hidden root は画面に表示しない", () => {
    const rootBlock = new BlockEntity("hidden-root", [
      new BlockEntity("first"),
      new BlockEntity("second"),
    ]);

    initializeState(rootBlock);
    render(<TestEditor />);

    expect(screen.queryByText("hidden-root")).toBeNull();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.getByText("first")).toBeTruthy();
    expect(screen.getByText("second")).toBeTruthy();
  });

  it("[OE-MODE-001][OE-MODE-005] 表示モードのブロックをクリックすると編集モードに遷移する", async () => {
    renderEditor(["first", "second"]);

    fireEvent.click(getTextboxByText("first"));

    await waitFor(() => {
      const editable = getEditableTextboxes();
      expect(editable).toHaveLength(1);
      expect(editable[0]?.textContent).toBe("first");
    });
  });

  it("[OE-MODE-002][OE-MODE-005] 別のブロックをクリックすると編集対象が切り替わる", async () => {
    renderEditor(["first", "second"]);

    fireEvent.click(getTextboxByText("first"));
    fireEvent.click(getTextboxByText("second"));

    await waitFor(() => {
      const editable = getEditableTextboxes();
      expect(editable).toHaveLength(1);
      expect(editable[0]?.textContent).toBe("second");
    });
  });

  it("[OE-MODE-004] 外側へフォーカスが移ると変更を保存して表示モードに戻る", async () => {
    renderEditor(["first"]);

    fireEvent.click(getTextboxByText("first"));

    const editable = await waitForEditableTextbox("first");
    editable.innerText = "updated";

    const outside = screen.getByRole("button", { name: "outside" });
    outside.focus();
    fireEvent.blur(editable);
    fireEvent.click(outside);

    await waitFor(() => {
      expect(getEditableTextboxes()).toHaveLength(0);
      expect(screen.getByText("updated")).toBeTruthy();
    });
  });
});

describe("ブロック分割", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("[OE-SPLIT-001] Enter でキャレット位置を前後に分割する", async () => {
    renderEditor(["hello"]);

    fireEvent.click(getTextboxByText("hello"));

    const editable = await waitForEditableTextbox("hello");
    editable.innerText = "hello";
    installSelectionMock(editable.firstChild, 2);

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
});

describe("キー移動", () => {
  it("[OE-MODE-003][OE-MOVE-001] カーソルがブロック先頭にある場合は一つ前のブロック末尾に移動する", async () => {
    renderEditor(["first", "second"]);

    fireEvent.click(getTextboxByText("second"));

    const editable = await waitForEditableTextbox("second");
    installSelectionMock(editable.firstChild, 0);

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

    fireEvent.click(getTextboxByText("first"));

    const editable = await waitForEditableTextbox("first");
    installSelectionMock(editable.firstChild, "first".length);

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

    fireEvent.click(getTextboxByText("ab\ncd"));

    const editable = await waitForEditableTextbox("ab\ncd");
    installSelectionMock(editable.firstChild, 4);

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

    fireEvent.click(getTextboxByText("ab\ncd"));

    const editable = await waitForEditableTextbox("ab\ncd");
    editable.innerText = "ab\ncd";
    installSelectionMock(editable.firstChild, 3);

    fireEvent.keyDown(editable, { key: "e", ctrlKey: true });

    await waitFor(() => {
      expect(getCaretPositionState()).toEqual({
        blockId: getRootBlockState().children[0]?.id,
        caretOffset: 5,
      });
    });
  });
});

function TestEditor(): JSX.Element {
  const [rootBlock] = useRootBlock();

  return (
    <div>
      <button type="button">outside</button>
      {rootBlock.children.map((block) => (
        <BlockComponent key={block.id} block={block} />
      ))}
    </div>
  );
}

function renderEditor(contents: string[]): void {
  const rootBlock = new BlockEntity(
    "",
    contents.map((content) => new BlockEntity(content)),
  );
  initializeState(rootBlock);
  render(<TestEditor />);
}

function getTextboxByText(text: string): HTMLElement {
  const target = screen
    .getAllByRole("textbox")
    .find((element) => element.textContent === text);
  if (!target) {
    throw new Error(`Textbox for "${text}" was not found.`);
  }
  return target;
}

function getEditableTextboxes(): HTMLElement[] {
  return screen
    .getAllByRole("textbox")
    .filter((element) => element.getAttribute("contenteditable") === "true");
}

async function waitForEditableTextbox(text: string): Promise<HTMLElement> {
  await waitFor(() => {
    expect(getEditableTextboxes()).toHaveLength(1);
  });

  const editable = getEditableTextboxes()[0];
  if (!editable || editable.textContent !== text) {
    throw new Error(`Editable textbox for "${text}" was not found.`);
  }
  return editable;
}

function installSelectionMock(
  node: Node | null,
  offset: number,
): SelectionState {
  let currentRange = document.createRange();
  if (node) {
    currentRange.setStart(node, offset);
    currentRange.setEnd(node, offset);
  }

  const selection = {
    addRange(range: Range): void {
      currentRange = range;
      selection.anchorNode = range.startContainer;
      selection.anchorOffset = range.startOffset;
    },
    anchorNode: node,
    anchorOffset: offset,
    getRangeAt(): Range {
      return currentRange;
    },
    rangeCount: 1,
    removeAllRanges: vi.fn(),
  };

  vi.spyOn(window, "getSelection").mockReturnValue(
    selection as unknown as Selection,
  );

  return selection;
}

function getCaretPositionState(): {
  blockId: string;
  caretOffset: number;
} | null {
  return caretPositionState as {
    blockId: string;
    caretOffset: number;
  } | null;
}

function getRootBlockState(): BlockEntity {
  return rootBlockState as BlockEntity;
}

type SelectionState = {
  addRange: (range: Range) => void;
  anchorNode: Node | null;
  anchorOffset: number;
  getRangeAt: () => Range;
  rangeCount: number;
  removeAllRanges: () => void;
};
