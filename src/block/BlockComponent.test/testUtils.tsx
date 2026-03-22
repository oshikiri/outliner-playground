import {
  render,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/preact";
import type { JSX } from "preact";
import { afterEach, vi, expect } from "vitest";

import ActiveBlockEditor from "../ActiveBlockEditor";
import BlockComponent from "../BlockComponent";
import BlockEntity from "../BlockEntity";
import { initializeState, useRootBlock } from "../../state";

let rootBlockState: unknown = null;
let editorSessionState: unknown = null;
const rootListeners = new Set<(value: unknown) => void>();
const editorSessionListeners = new Set<(value: unknown) => void>();

vi.mock("../../state", async () => {
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
      editorSessionState = null;
      for (const listener of rootListeners) {
        listener(rootBlockState);
      }
      for (const listener of editorSessionListeners) {
        listener(editorSessionState);
      }
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
        for (const listener of rootListeners) {
          listener(rootBlockState);
        }
      };

      return [value, updateValue];
    },
    useEditorSession(): [
      unknown,
      (update: unknown | ((prev: unknown) => unknown)) => void,
    ] {
      const [value, setValue] = hooks.useState(editorSessionState);

      hooks.useEffect(() => {
        editorSessionListeners.add(setValue);
        return () => editorSessionListeners.delete(setValue);
      }, []);

      const updateValue = (
        update: unknown | ((prev: unknown) => unknown),
      ): void => {
        editorSessionState = applyUpdate(editorSessionState, update);
        for (const listener of editorSessionListeners) {
          listener(editorSessionState);
        }
      };

      return [value, updateValue];
    },
  };
});

afterEach(() => {
  cleanup();
  rootListeners.clear();
  editorSessionListeners.clear();
  rootBlockState = null;
  editorSessionState = null;
  vi.restoreAllMocks();
});

export function renderEditor(contents: string[]): void {
  const rootBlock = new BlockEntity(
    "",
    contents.map((content) => new BlockEntity(content)),
  );
  renderRootBlock(rootBlock);
}

export function renderRootBlock(rootBlock: BlockEntity): void {
  initializeState(rootBlock);
  render(<TestEditor />);
}

export function initializeRootBlockState(rootBlock: BlockEntity): void {
  initializeState(rootBlock);
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

export function getEditableTextboxes(): HTMLElement[] {
  return screen
    .queryAllByRole("textbox")
    .filter((element) => element.getAttribute("contenteditable") === "true");
}

export async function waitForEditableTextbox(
  text: string,
): Promise<HTMLElement> {
  await waitFor(() => {
    expect(getEditableTextboxes()).toHaveLength(1);
  });

  const editable = getEditableTextboxes()[0];
  if (!editable || editable.textContent !== text) {
    throw new Error(`Editable textbox for "${text}" was not found.`);
  }
  return editable;
}

/**
 * Click a block, wait until it enters edit mode, and optionally seed its
 * editable content and caret position.
 *
 * @param text - Visible text of the block to activate.
 * @param options - Optional content and caret setup applied after editing starts.
 * @returns The editable textbox element for the target block.
 */
export async function beginEditing(
  text: string,
  options: BeginEditingOptions = {},
): Promise<HTMLElement> {
  fireEvent.click(getTextboxByText(text), options.clickEventInit);

  const editable = await waitForEditableTextbox(text);
  if (options.content !== undefined) {
    editable.innerText = options.content;
  }
  if (options.caretOffset !== undefined) {
    installSelectionMock(editable.firstChild, options.caretOffset);
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

export function getCaretPositionState(): {
  blockId: string;
  caretOffset: number;
} | null {
  const editorSession = editorSessionState as {
    activeBlockId: string;
    caretOffset: number;
    draftText: string;
  } | null;
  if (!editorSession) {
    return null;
  }

  return {
    blockId: editorSession.activeBlockId,
    caretOffset: editorSession.caretOffset,
  };
}

export function getRootBlockState(): BlockEntity {
  return rootBlockState as BlockEntity;
}

export function setCaretPositionState(
  value: {
    blockId: string;
    caretOffset: number;
  } | null,
): void {
  if (!value) {
    editorSessionState = null;
    return;
  }

  const rootBlock = getRootBlockState();
  const block = rootBlock.findBlockById(value.blockId);
  if (!block) {
    throw new Error(`Block "${value.blockId}" was not found.`);
  }

  editorSessionState = {
    activeBlockId: value.blockId,
    caretOffset: value.caretOffset,
    draftText: block.content,
  };
}

export function renderBlurFallbackHarness(
  block: BlockEntity,
  onReady: (contentRef: { current: HTMLDivElement | null }) => void,
): void {
  render(<BlurFallbackHarness block={block} onReady={onReady} />);
}

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

function BlurFallbackHarness({
  block,
  onReady,
}: {
  block: BlockEntity;
  onReady: (contentRef: { current: HTMLDivElement | null }) => void;
}): JSX.Element {
  return (
    <div>
      <button type="button">outside</button>
      <ActiveBlockEditor block={block} onReady={onReady} />
    </div>
  );
}

type SelectionState = {
  addRange: (range: Range) => void;
  anchorNode: Node | null;
  anchorOffset: number;
  getRangeAt: () => Range;
  rangeCount: number;
  removeAllRanges: () => void;
};

type BeginEditingOptions = {
  content?: string;
  caretOffset?: number;
  clickEventInit?: MouseEventInit;
};
