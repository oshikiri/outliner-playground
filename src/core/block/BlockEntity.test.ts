import { beforeEach, describe, expect, it, vi } from "vitest";

import BlockEntity from "./BlockEntity";

describe("ブロック分割・結合", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("[OE-SPLIT-005] hidden root 自体は分割しない", () => {
    const root = new BlockEntity("");

    const newBlock = root.appendNewByNewline("", "");

    expect(newBlock).toBeNull();
    expect(root.children).toHaveLength(0);
  });

  it("子がない場合は次の兄弟ブロックとして分割する", () => {
    const block = new BlockEntity("hello");
    const sibling = new BlockEntity("after");
    const root = new BlockEntity("", [block, sibling]);

    const newBlock = block.appendNewByNewline("he", "llo");

    expect(newBlock).not.toBeNull();
    expect(root.children).toHaveLength(3);
    expect(root.children[0]?.content).toBe("he");
    expect(root.children[1]).toBe(newBlock);
    expect(root.children[1]?.content).toBe("llo");
    expect(root.children[2]).toBe(sibling);
    expect(root.children[1]?.parent).toBe(root);
  });

  it("子がある場合は先頭の子ブロックとして分割する", () => {
    const child = new BlockEntity("child");
    const block = new BlockEntity("hello", [child]);
    const root = new BlockEntity("", [block]);

    const newBlock = block.appendNewByNewline("he", "llo");

    const updatedBlock = root.children[0];
    expect(newBlock).not.toBeNull();
    expect(updatedBlock?.content).toBe("he");
    expect(updatedBlock?.children).toHaveLength(2);
    expect(updatedBlock?.children[0]).toBe(newBlock);
    expect(updatedBlock?.children[0]?.content).toBe("llo");
    expect(updatedBlock?.children[1]).toBe(child);
    expect(updatedBlock?.children[0]?.parent).toBe(updatedBlock);
  });
});

describe("階層操作", () => {
  it("前の兄弟ブロックの子としてインデントする", () => {
    const first = new BlockEntity("first");
    const target = new BlockEntity("target");
    const root = new BlockEntity("", [first, target]);

    const updatedParent = target.indent();

    expect(updatedParent).toBe(root);
    expect(root.children).toHaveLength(1);
    expect(root.children[0]).toBe(first);
    expect(first.children).toHaveLength(1);
    expect(first.children[0]).toBe(target);
    expect(target.parent).toBe(first);
  });

  it("先頭の兄弟ブロックはインデントしない", () => {
    const first = new BlockEntity("first");
    const second = new BlockEntity("second");
    const root = new BlockEntity("", [first, second]);

    const updatedParent = first.indent();

    expect(updatedParent).toBe(root);
    expect(root.children).toHaveLength(2);
    expect(root.children[0]).toBe(first);
    expect(root.children[1]).toBe(second);
    expect(first.parent).toBe(root);
  });

  it("アウトデント時は親の直後に移動し後続兄弟を子として吸収する", () => {
    const first = new BlockEntity("first");
    const grandchild = new BlockEntity("grandchild");
    const target = new BlockEntity("target", [grandchild]);
    const trailingSibling = new BlockEntity("trailing");
    const parent = new BlockEntity("parent", [first, target, trailingSibling]);
    const root = new BlockEntity("", [parent]);

    const result = target.outdent();

    const outdented = root.children[1];
    expect(result.parent).toBe(parent);
    expect(result.grandparent).toBe(root);
    expect(parent.children).toHaveLength(1);
    expect(parent.children[0]).toBe(first);
    expect(outdented?.content).toBe("target");
    expect(outdented?.children.map((child) => child.content)).toEqual([
      "grandchild",
      "trailing",
    ]);
    expect(outdented?.parent).toBe(root);
  });

  it("hidden root の直下にある block はアウトデントしない", () => {
    const child = new BlockEntity("child");
    const root = new BlockEntity("", [child]);

    const result = child.outdent();

    expect(result.parent).toBe(root);
    expect(result.grandparent).toBeNull();
    expect(root.children).toHaveLength(1);
    expect(root.children[0]).toBe(child);
    expect(child.parent).toBe(root);
  });
});

describe("ブロック順序変更", () => {
  it("子孫を保ったまま一つ前の兄弟ブロックと位置を入れ替える", () => {
    const first = new BlockEntity("first");
    const child = new BlockEntity("child");
    const target = new BlockEntity("target", [child]);
    const root = new BlockEntity("", [first, target]);

    const updatedParent = target.moveUp();

    expect(updatedParent).toBe(root);
    expect(root.children.map((block) => block.content)).toEqual([
      "target",
      "first",
    ]);
    expect(root.children[0]?.children[0]).toBe(child);
    expect(child.parent).toBe(target);
  });

  it("子孫を保ったまま一つ後の兄弟ブロックと位置を入れ替える", () => {
    const child = new BlockEntity("child");
    const target = new BlockEntity("target", [child]);
    const second = new BlockEntity("second");
    const root = new BlockEntity("", [target, second]);

    const updatedParent = target.moveDown();

    expect(updatedParent).toBe(root);
    expect(root.children.map((block) => block.content)).toEqual([
      "second",
      "target",
    ]);
    expect(root.children[1]?.children[0]).toBe(child);
    expect(child.parent).toBe(target);
  });
});

describe("ブロック移動の走査順", () => {
  it("[OE-TREE-002] ブロックを pre-order depth-first 走査順で前後にたどれる", () => {
    const grandchild = new BlockEntity("grandchild");
    const child = new BlockEntity("child", [grandchild]);
    const sibling = new BlockEntity("sibling");
    const root = new BlockEntity("", [child, sibling]);

    expect(child.findNextBlock()).toBe(grandchild);
    expect(grandchild.findNextBlock()).toBe(sibling);
    expect(sibling.findPrevBlock()).toBe(grandchild);
    expect(grandchild.findPrevBlock()).toBe(child);
    expect(child.findPrevBlock()).toBe(root);
  });
});
