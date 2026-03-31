import type { BlockState } from "../core/block/blockStore";

export type ActiveEditorSession = {
  activeBlockId: string;
  caretOffset: number;
  draftText: string;
};

export type EditorSession = ActiveEditorSession | null;

export function createEditorSession(
  block: Pick<BlockState, "id" | "content">,
  caretOffset: number = block.content.length,
): ActiveEditorSession {
  return {
    activeBlockId: block.id,
    caretOffset,
    draftText: block.content,
  };
}
