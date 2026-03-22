import type { EditorSession } from "../state";
import type { BlockState } from "./blockStore";

type ActiveEditorSession = Exclude<EditorSession, null>;

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
