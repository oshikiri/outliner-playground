import {
  render,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/preact";
import type { JSX } from "preact";
import { afterEach, vi, expect } from "vitest";

import {
  createBlockStore,
  getChildBlocks,
  indentBlock,
  isBlockStore,
  joinBlockWithPreviousSibling,
  moveBlockDown,
  moveBlockUp,
  outdentBlock,
  findBlock,
  splitBlockAtCaret,
  updateBlockContent,
  type BlockState,
  type BlockStore,
} from "../../core/block/blockStore";
import BlockEntity from "../../core/block/BlockEntity";
import { createBlockTree } from "../blockStoreEntity";
import type { EditorSession } from "../../state";
import { initializeState, useRootBlock } from "../../state";
import ActiveBlockEditor from "../../ui/block/ActiveBlockEditor";
import BlockComponent from "../../ui/block/BlockComponent";

let rootBlockState: BlockStore | null = null;
let editorSessionState: EditorSession = null;
const rootListeners = new Set<(value: BlockStore) => void>();
const editorSessionListeners = new Set<(value: EditorSession) => void>();

function notifyRootListeners(): void {
  if (!rootBlockState) {
    throw new Error("rootBlockState was not initialized.");
  }

  for (const listener of rootListeners) {
    listener(rootBlockState);
  }
}

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
    initializeState(rootBlock: BlockStore | BlockEntity): void {
      rootBlockState = isBlockStore(rootBlock)
        ? rootBlock
        : createBlockStore(rootBlock);
      editorSessionState = null;
      notifyRootListeners();
      for (const listener of editorSessionListeners) {
        listener(editorSessionState);
      }
    },
    useRootBlock(): [BlockStore, (update: BlockStoreUpdate) => void] {
      if (!rootBlockState) {
        throw new Error("rootBlockState was not initialized.");
      }
      const [value, setValue] = hooks.useState(rootBlockState);

      hooks.useEffect(() => {
        rootListeners.add(setValue);
        return () => rootListeners.delete(setValue);
      }, []);

      const updateValue = (update: BlockStoreUpdate): void => {
        if (!rootBlockState) {
          throw new Error("rootBlockState was not initialized.");
        }
        rootBlockState = applyUpdate(rootBlockState, update);
        notifyRootListeners();
      };

      return [value, updateValue];
    },
    useRootBlockValue(): BlockStore {
      if (!rootBlockState) {
        throw new Error("rootBlockState was not initialized.");
      }
      const [value, setValue] = hooks.useState(rootBlockState);

      hooks.useEffect(() => {
        rootListeners.add(setValue);
        return () => rootListeners.delete(setValue);
      }, []);

      return value;
    },
    useSetRootBlock(): (update: BlockStoreUpdate) => void {
      return (update: BlockStoreUpdate): void => {
        if (!rootBlockState) {
          throw new Error("rootBlockState was not initialized.");
        }
        rootBlockState = applyUpdate(rootBlockState, update);
        notifyRootListeners();
      };
    },
    useUpdateBlockContent(): (blockId: string, content: string) => void {
      return (blockId: string, content: string): void => {
        if (!rootBlockState) {
          throw new Error("rootBlockState was not initialized.");
        }
        rootBlockState = updateBlockContent(rootBlockState, blockId, content);
        notifyRootListeners();
      };
    },
    useSplitBlockAtCaret(): (
      blockId: string,
      beforeCaretText: string,
      afterCaretText: string,
    ) => BlockState {
      return (blockId, beforeCaretText, afterCaretText): BlockState => {
        if (!rootBlockState) {
          throw new Error("rootBlockState was not initialized.");
        }
        const nextRootBlock = splitBlockAtCaret(
          rootBlockState,
          blockId,
          beforeCaretText,
          afterCaretText,
        );
        rootBlockState = nextRootBlock.rootBlock;
        notifyRootListeners();
        return nextRootBlock.newBlock;
      };
    },
    useIndentBlock(): (blockId: string, content: string) => void {
      return (blockId: string, content: string): void => {
        if (!rootBlockState) {
          throw new Error("rootBlockState was not initialized.");
        }
        rootBlockState = indentBlock(
          updateBlockContent(rootBlockState, blockId, content),
          blockId,
        );
        notifyRootListeners();
      };
    },
    useOutdentBlock(): (blockId: string, content: string) => void {
      return (blockId: string, content: string): void => {
        if (!rootBlockState) {
          throw new Error("rootBlockState was not initialized.");
        }
        rootBlockState = outdentBlock(
          updateBlockContent(rootBlockState, blockId, content),
          blockId,
        );
        notifyRootListeners();
      };
    },
    useMoveBlockUp(): (blockId: string, content: string) => void {
      return (blockId: string, content: string): void => {
        if (!rootBlockState) {
          throw new Error("rootBlockState was not initialized.");
        }
        rootBlockState = moveBlockUp(
          updateBlockContent(rootBlockState, blockId, content),
          blockId,
        );
        notifyRootListeners();
      };
    },
    useMoveBlockDown(): (blockId: string, content: string) => void {
      return (blockId: string, content: string): void => {
        if (!rootBlockState) {
          throw new Error("rootBlockState was not initialized.");
        }
        rootBlockState = moveBlockDown(
          updateBlockContent(rootBlockState, blockId, content),
          blockId,
        );
        notifyRootListeners();
      };
    },
    useJoinBlockWithPreviousSibling(): (
      blockId: string,
      currentContent: string,
    ) => {
      rootBlock: BlockStore;
      previousBlock: BlockState;
      caretOffset: number;
    } | null {
      return (blockId: string, currentContent: string) => {
        if (!rootBlockState) {
          throw new Error("rootBlockState was not initialized.");
        }
        const mergedBlockResult = joinBlockWithPreviousSibling(
          rootBlockState,
          blockId,
          currentContent,
        );
        rootBlockState = mergedBlockResult?.rootBlock ?? rootBlockState;
        notifyRootListeners();
        return mergedBlockResult;
      };
    },
    useBlock(blockId: string): BlockState | null {
      if (!rootBlockState) {
        throw new Error("rootBlockState was not initialized.");
      }
      const [value, setValue] = hooks.useState(
        findBlock(rootBlockState, blockId),
      );

      hooks.useEffect(() => {
        const listener = (nextRootBlock: BlockStore): void => {
          setValue(findBlock(nextRootBlock, blockId));
        };
        rootListeners.add(listener);
        return () => rootListeners.delete(listener);
      }, [blockId]);

      return value;
    },
    useEditorSession(): [EditorSession, (update: EditorSessionUpdate) => void] {
      const [value, setValue] = hooks.useState(editorSessionState);

      hooks.useEffect(() => {
        editorSessionListeners.add(setValue);
        return () => editorSessionListeners.delete(setValue);
      }, []);

      const updateValue = (update: EditorSessionUpdate): void => {
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
  const editorSession = editorSessionState;
  if (!editorSession) {
    return null;
  }

  return {
    blockId: editorSession.activeBlockId,
    caretOffset: editorSession.caretOffset,
  };
}

export function getRootBlockState(): BlockEntity {
  if (!rootBlockState) {
    throw new Error("rootBlockState was not initialized.");
  }
  return createBlockTree(rootBlockState);
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

  if (!rootBlockState) {
    throw new Error("rootBlockState was not initialized.");
  }
  const rootBlock = rootBlockState;
  const block = findBlock(rootBlock, value.blockId);
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
      {getChildBlocks(rootBlock, rootBlock.rootId).map((block) => (
        <BlockComponent key={block.id} blockId={block.id} />
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
      <ActiveBlockEditor blockId={block.id} onReady={onReady} />
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

type BlockStoreUpdate = BlockStore | ((prev: BlockStore) => BlockStore);
type EditorSessionUpdate =
  | EditorSession
  | ((prev: EditorSession) => EditorSession);
