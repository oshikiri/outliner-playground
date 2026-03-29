import type { BlockState } from "../core/block/blockStore";

export type EditorSession = {
  activeBlockId: string;
  caretOffset: number;
  draftText: string;
} | null;

export type ActiveEditorSession = Exclude<EditorSession, null>;

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
