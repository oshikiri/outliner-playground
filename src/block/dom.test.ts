import { afterEach, describe, expect, it } from "vitest";

import { setCaretOffset } from "./dom";

afterEach(() => {
  window.getSelection()?.removeAllRanges();
  document.body.replaceChildren();
});

describe("setCaretOffset", () => {
  it("入れ子のテキストノード全体を通したオフセットでキャレットを配置する", () => {
    const root = document.createElement("div");
    const first = document.createElement("span");
    const second = document.createElement("strong");

    first.textContent = "ab";
    second.textContent = "cd";
    root.append(first, second);
    document.body.append(root);

    const selection = window.getSelection();
    setCaretOffset(root, 3, selection);

    expect(selection?.anchorNode).toBe(second.firstChild);
    expect(selection?.anchorOffset).toBe(1);
  });

  it("テキストノードがない要素でも先頭にキャレットを配置する", () => {
    const root = document.createElement("div");
    document.body.append(root);

    const selection = window.getSelection();
    setCaretOffset(root, 0, selection);

    expect(selection?.anchorNode).toBe(root);
    expect(selection?.anchorOffset).toBe(0);
  });
});
