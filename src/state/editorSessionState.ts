import { atom, useAtom, type SetStateAction } from "jotai";

import type { EditorSession } from "./editorSession";

export const editorSessionAtom = atom<EditorSession>(null);

export type UpdateEditorSession = SetStateAction<EditorSession>;

export function useEditorSession(): [
  EditorSession,
  (updateFn: UpdateEditorSession) => void,
] {
  return useAtom(editorSessionAtom);
}
