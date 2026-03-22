type ResetShortcutEvent = Pick<
  KeyboardEvent,
  "ctrlKey" | "key" | "preventDefault"
>;

type GlobalEditorKeydownHandlers = {
  resetRootBlock: () => void;
  resetEditorSession: () => void;
};

export function handleGlobalEditorKeydown(
  event: ResetShortcutEvent,
  handlers: GlobalEditorKeydownHandlers,
): void {
  if (!isResetShortcut(event)) {
    return;
  }

  handlers.resetRootBlock();
  handlers.resetEditorSession();
  event.preventDefault();
}

function isResetShortcut(
  event: Pick<KeyboardEvent, "ctrlKey" | "key">,
): boolean {
  return event.ctrlKey && event.key === "k";
}
