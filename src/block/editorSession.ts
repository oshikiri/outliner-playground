import type { EditorSession } from "../state";
import BlockEntity, { createBlock } from "./BlockEntity";

type ActiveEditorSession = Exclude<EditorSession, null>;

export function createEditorSession(
  block: BlockEntity,
  caretOffset: number = block.content.length,
): ActiveEditorSession {
  return {
    activeBlockId: block.id,
    caretOffset,
    draftText: block.content,
  };
}

export function commitEditorSessionToRoot(
  rootBlock: BlockEntity,
  editorSession: EditorSession,
): BlockEntity {
  if (!editorSession) {
    return rootBlock;
  }

  const currentBlock = rootBlock.findBlockById(editorSession.activeBlockId);
  if (!currentBlock || currentBlock.content === editorSession.draftText) {
    return rootBlock;
  }

  const updatedBlock = createBlock(currentBlock);
  updatedBlock.content = editorSession.draftText;
  return rootBlock.updateBlockById(updatedBlock.id, updatedBlock);
}
