import { afterEach, describe, expect, it, vi } from "vitest";

import { getNearestCaretOffset, setCaretOffset } from "./dom";

afterEach(() => {
  window.getSelection()?.removeAllRanges();
  document.body.replaceChildren();
  vi.restoreAllMocks();
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

describe("getNearestCaretOffset", () => {
  it("caretRangeFromPoint の位置をプレーンテキストのオフセットへ変換する", () => {
    const root = document.createElement("div");
    const first = document.createTextNode("ab");
    const second = document.createElement("strong");

    second.textContent = "cd";
    root.append(first, second);
    document.body.append(root);

    const range = document.createRange();
    const targetNode = second.firstChild;
    if (!targetNode) {
      throw new Error("target text node was not found.");
    }
    range.setStart(targetNode, 1);
    range.setEnd(targetNode, 1);
    Object.defineProperty(document, "caretRangeFromPoint", {
      configurable: true,
      value: vi.fn(() => range),
    });

    expect(getNearestCaretOffset(root, document, 10, 20)).toBe(3);
  });

  it("クリック位置が要素外なら null を返す", () => {
    const root = document.createElement("div");
    const outside = document.createElement("div");

    root.textContent = "root";
    outside.textContent = "outside";
    document.body.append(root, outside);

    Object.defineProperty(document, "caretPositionFromPoint", {
      configurable: true,
      value: vi.fn(() => ({
        offsetNode: outside.firstChild,
        offset: 2,
      })),
    });

    expect(getNearestCaretOffset(root, document, 5, 7)).toBeNull();
  });
});
