import { fireEvent, waitFor } from "@testing-library/preact";
import { describe, expect, it } from "vitest";

import BlockEntity from "../../core/block/BlockEntity";
import {
  getCaretPositionState,
  getEditableTextboxes,
  getRootBlockState,
  initializeRootBlockState,
  renderBlurFallbackHarness,
  setCaretPositionState,
  waitForEditableTextbox,
} from "./BlockComponent.test/testUtils";

describe("ActiveBlockEditor", () => {
  it("同じ block の後継 editor へ focus が移る blur では編集モードを維持する", async () => {
    const target = new BlockEntity("first");
    const rootBlock = new BlockEntity("", [target]);

    initializeRootBlockState(rootBlock);
    setCaretPositionState({ blockId: target.id, caretOffset: 0 });
    renderBlurFallbackHarness(target, () => {});

    const editable = await waitForEditableTextbox("first");
    editable.innerText = "updated";

    const replacementEditor = document.createElement("div");
    replacementEditor.setAttribute("contenteditable", "true");
    replacementEditor.dataset.blockId = target.id;
    document.body.append(replacementEditor);

    try {
      replacementEditor.focus();
      fireEvent.blur(editable);

      await waitFor(() => {
        expect(getCaretPositionState()).toEqual({
          blockId: target.id,
          caretOffset: 0,
        });
        expect(getRootBlockState().children[0]?.content).toBe("updated");
        expect(getEditableTextboxes()).toHaveLength(1);
      });
    } finally {
      replacementEditor.remove();
    }
  });
});
