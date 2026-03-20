import {
  render,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/preact";
import type { JSX } from "preact";
import { useEffect } from "preact/hooks";
import { afterEach, vi, expect } from "vitest";

import BlockComponent from "../BlockComponent";
import BlockEntity from "../BlockEntity";
import { useBlockInteractions } from "../useBlockInteractions";
import { initializeState, useRootBlock } from "../../state";

let rootBlockState: unknown = null;
let caretPositionState: unknown = null;
const rootListeners = new Set<(value: unknown) => void>();
const caretListeners = new Set<(value: unknown) => void>();

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
      caretPositionState = null;
      for (const listener of rootListeners) {
        listener(rootBlockState);
      }
      for (const listener of caretListeners) {
        listener(caretPositionState);
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
        for (const listener of caretListeners) {
          listener(caretPositionState);
        }
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
    .getAllByRole("textbox")
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
  fireEvent.click(getTextboxByText(text));

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
  return caretPositionState as {
    blockId: string;
    caretOffset: number;
  } | null;
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
  caretPositionState = value;
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
  const { contentRef, isEditing, onBlur } = useBlockInteractions(block);

  useEffect(() => {
    onReady(contentRef);
  }, [contentRef, onReady]);

  return (
    <div>
      <button type="button">outside</button>
      <div
        ref={contentRef}
        contentEditable={isEditing || undefined}
        onBlur={onBlur}
        role="textbox"
      >
        {block.content}
      </div>
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
};
