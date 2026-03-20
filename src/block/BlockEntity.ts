/**
 * Block node for the outliner tree.
 *
 * Traversal convention: unless explicitly stated otherwise, tree traversal
 * is pre-order depth-first.
 */
export default class BlockEntity {
  // [P3] 走査/更新/シリアライズが1クラスに集約されているため、ドメインモデルと操作を分割したい。
  parent: BlockEntity | null = null;
  id: string = crypto.randomUUID();

  constructor(
    public content: string,
    public children: BlockEntity[] = [],
  ) {
    // [P3] NOTE: 引数オブジェクトを書き換えて親子関係を再設定するので純粋なデータモデルとは言えません
    this.content = content;
    for (const child of children) {
      child.withParent(this);
    }
    this.children = children;
  }

  withParent(parent: BlockEntity | null): this {
    this.parent = parent;
    return this;
  }

  /**
   * Retrieve the next block in a pre-order depth-first tree traversal.
   *
   * cf. Tree traversal - Wikipedia https://en.wikipedia.org/wiki/Tree_traversal
   */
  getNextBlock(): BlockEntity | null {
    // case 1: the current block has children
    //   Return the first child
    if (this.children.length > 0) {
      return this.children[0] ?? null;
    }

    // case 2: the current block has no children
    //   Go up the tree until we find a parent that has a closest next sibling
    let current: BlockEntity | null = this;
    while (current?.parent) {
      const [parent, currentIdx] = current.getParentAndIndex();
      if (!parent || currentIdx === -1) {
        console.debug("no parent at getNextBlock");
        return null;
      }
      // if a closest next sibling exists
      if (currentIdx < parent.children.length - 1) {
        return parent.children[currentIdx + 1] ?? null;
      }
      current = parent;
    }
    console.debug("no parent at getNextBlock");
    return null;
  }

  /**
   * Retrieve the previous block in a pre-order depth-first tree traversal.
   *
   * cf. Tree traversal - Wikipedia https://en.wikipedia.org/wiki/Tree_traversal
   */
  getPrevBlock(): BlockEntity | null {
    const [parent, currentIdx] = this.getParentAndIndex();
    if (!parent) {
      return null;
    }
    if (currentIdx === 0) {
      return parent;
    }
    const closestPreviousSibling = parent.children[currentIdx - 1];
    if (!closestPreviousSibling) {
      return null;
    }
    return closestPreviousSibling.getLastDescendant();
  }

  /**
   * Returns the last descendant of the current block, including itself.
   */
  getLastDescendant(): BlockEntity {
    if (this.children.length === 0) {
      return this;
    }
    const lastChild = this.getLastChild();
    if (!lastChild) {
      return this;
    }
    return lastChild.getLastDescendant();
  }

  getLastChild(): BlockEntity | undefined {
    return this.children[this.children.length - 1];
  }

  /**
   * Retrieve the parent block and the index of the current block in the parent's children array.
   */
  getParentAndIndex(): [BlockEntity | null, number] {
    if (!this?.parent?.children) {
      console.error("Block has no parent or parent has no children.");
      return [null, -1];
    }

    const idx = this.parent.children.findIndex((child) => child.id === this.id);
    return [this.parent, idx];
  }

  updateBlockById(id: string, updatedBlock: BlockEntity): BlockEntity {
    // [P3] NOTE: update系メソッドも外部状態に依存しており純粋関数になっていません
    if (this.id === id) {
      return updatedBlock;
    }

    if (this.children.length === 0) {
      return this;
    }

    const nextChildren = this.children.map((child) =>
      child.updateBlockById(id, updatedBlock),
    );

    const clone = new BlockEntity(this.content, nextChildren);
    clone.id = this.id;
    clone.parent = this.parent;
    return clone;
  }

  /**
   * Retrieve its descendant block by its id.
   *
   * NOTE: This function has a time complexity: O(the number of descendant blocks).
   * This is acceptable because the number of descendant blocks is expected to be small (< 1000)
   */
  findBlockById(id: string): BlockEntity | null {
    if (this.id === id) {
      return this;
    }

    for (const child of this.children) {
      const found = child.findBlockById(id);
      if (found) {
        return found;
      }
    }

    return null;
  }

  /**
   * Append a new block by splitting the current block at the caret position.
   *
   * @param beforeCaretText
   * @param afterCaretText
   * @returns newly created BlockEntity that contains afterCaretText
   */
  appendNewByNewline(
    beforeCaretText: string,
    afterCaretText: string,
  ): BlockEntity | null {
    if (this.parent === null) {
      console.warn("Cannot append new block to root-level block.");
      return null;
    }

    console.warn("appendNewByNewline", { beforeCaretText, afterCaretText });
    const [parent, idx] = this.getParentAndIndex();
    if (!parent || idx === -1) {
      console.warn("Cannot append new block without a parent.");
      return null;
    }
    const updatedBlock = new BlockEntity(
      beforeCaretText,
      this.children,
    ).withParent(parent);
    updatedBlock.id = this.id;
    parent.children[idx] = updatedBlock;

    // 1. If the block has children, insert the new block as the first child.
    if (updatedBlock.children.length > 0) {
      const newBlock = new BlockEntity(afterCaretText, []).withParent(
        updatedBlock,
      );
      updatedBlock.children = [newBlock, ...updatedBlock.children];
      return newBlock;
    }

    // 2. Otherwise, insert the new block as the next sibling.
    const newBlock = new BlockEntity(afterCaretText, []).withParent(parent);
    parent.children.splice(idx + 1, 0, newBlock);
    return newBlock;
  }

  indent(): BlockEntity | null {
    const [parent, currentIdx] = this.getParentAndIndex();
    if (!parent || currentIdx === -1) {
      console.warn("Block has no parent:", this);
      return parent;
    }

    if (currentIdx === 0) {
      console.warn(
        "Cannot indent block that is the first child of its parent.",
      );
      return parent;
    }

    const siblingsBefore = parent.children.slice(0, currentIdx);
    const prevSibling = siblingsBefore[siblingsBefore.length - 1];
    if (!prevSibling) {
      console.warn("No previous sibling to indent to.");
      return parent;
    }
    this.parent = prevSibling;
    prevSibling.children.push(this);

    const siblingsAfter = parent.children.slice(currentIdx + 1);
    parent.children = [...siblingsBefore, ...siblingsAfter];

    return parent;
  }

  outdent(): { parent: BlockEntity | null; grandparent: BlockEntity | null } {
    const [parent, currentIdx] = this.getParentAndIndex();
    if (!parent || currentIdx === -1) {
      console.warn("Block has no parent:", this);
      return { parent, grandparent: null };
    }
    if (!parent.parent) {
      console.warn("Cannot outdent block that is a child of the root.");
      return { parent, grandparent: null };
    }

    const [grandparent, parentIdx] = parent.getParentAndIndex();
    if (!grandparent || parentIdx === -1) {
      console.warn("Parent has no parent:", parent);
      return { parent, grandparent };
    }

    const siblingsBefore = parent.children.slice(0, currentIdx);
    const siblingsAfter = parent.children.slice(currentIdx + 1);

    parent.children = siblingsBefore;
    const updatedCurrent = new BlockEntity(this.content, [
      ...this.children,
      ...siblingsAfter,
    ]).withParent(grandparent);
    updatedCurrent.id = this.id;

    grandparent.children.splice(parentIdx + 1, 0, updatedCurrent);

    return { parent, grandparent };
  }

  moveUp(): BlockEntity | null {
    const [parent, currentIdx] = this.getParentAndIndex();
    if (!parent || currentIdx <= 0) {
      return parent;
    }

    const prevSibling = parent.children[currentIdx - 1];
    if (!prevSibling) {
      return parent;
    }

    swapChildren(parent.children, currentIdx - 1, currentIdx);
    return parent;
  }

  moveDown(): BlockEntity | null {
    const [parent, currentIdx] = this.getParentAndIndex();
    if (
      !parent ||
      currentIdx === -1 ||
      currentIdx >= parent.children.length - 1
    ) {
      return parent;
    }

    const nextSibling = parent.children[currentIdx + 1];
    if (!nextSibling) {
      return parent;
    }

    swapChildren(parent.children, currentIdx, currentIdx + 1);
    return parent;
  }

  toJSON(): BlockJSON {
    return {
      id: this.id,
      content: this.content,
      children:
        this.children.length === 0
          ? undefined
          : this.children.map((child) => child.toJSON()),
    };
  }
}

type BlockJSON = {
  id: string;
  content: string;
  children?: BlockJSON[];
};

export function createBlock(obj: BlockEntity | BlockJSON): BlockEntity {
  const children = obj.children?.map(createBlock) ?? [];
  const parent = obj instanceof BlockEntity ? obj.parent : null;
  const block = new BlockEntity(obj.content, children).withParent(parent);
  block.id = obj.id;
  return block;
}

function swapChildren(
  children: BlockEntity[],
  leftIndex: number,
  rightIndex: number,
): void {
  const leftChild = children[leftIndex];
  const rightChild = children[rightIndex];
  if (!leftChild || !rightChild) {
    return;
  }

  children[leftIndex] = rightChild;
  children[rightIndex] = leftChild;
}
