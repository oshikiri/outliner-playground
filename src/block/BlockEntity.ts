// [P2] @owner: ファイル名 BlockEntity.ts とクラス名 Block の不一致。どちらかに統一（例: ファイルを Block.ts に、またはクラス名を BlockEntity）。
/**
 * Block node for the outliner tree.
 *
 * Traversal convention: unless explicitly stated otherwise, tree traversal
 * is pre-order depth-first.
 */
export default class Block {
  parent: Block | null = null;
  id: string = crypto.randomUUID();

  constructor(
    public content: string,
    public children: Block[] = [],
  ) {
    this.content = content;
    children.forEach((child) => child.withParent(this));
    this.children = children;
  }

  withParent(parent: Block | null): this {
    this.parent = parent;
    return this;
  }

  /**
   * Retrieve the next block in a pre-order depth-first tree traversal.
   *
   * cf. Tree traversal - Wikipedia https://en.wikipedia.org/wiki/Tree_traversal
   */
  getNextBlock(): Block | null {
    // case 1: the current block has children
    //   Return the first child
    if (this.children.length > 0) {
      return this.children[0];
    }

    // case 2: the current block has no children
    //   Go up the tree until we find a parent that has a closest next sibling
    let current: Block | null = this;
    while (current?.parent) {
      const [parent, currentIdx]: any = current.getParentAndIndex();
      if (!parent || currentIdx === -1) {
        console.debug("no parent at getNextBlock");
        return null;
      }
      // if a closest next sibling exists
      if (currentIdx < parent.children.length - 1) {
        return parent.children[currentIdx + 1];
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
  getPrevBlock(): Block | null {
    const [parent, currentIdx] = this.getParentAndIndex();
    if (!parent) {
      return null;
    }
    if (currentIdx === 0) {
      return parent;
    }
    const closestPreviousSibling = parent.children[currentIdx - 1];
    return closestPreviousSibling.getLastDescendant();
  }

  /**
   * Returns the last descendant of the current block, including itself.
   */
  getLastDescendant(): Block {
    if (this.children.length === 0) {
      return this;
    }
    const lastChild = this.getLastChild();
    if (!lastChild) {
      return this;
    }
    return lastChild.getLastDescendant();
  }

  // [P3] @owner: children が空の際に undefined を返すため、返り値の型/ガードの明示を検討。
  getLastChild(): Block | undefined {
    return this.children[this.children.length - 1];
  }

  /**
   * Retrieve the parent block and the index of the current block in the parent's children array.
   */
  getParentAndIndex(): [Block | null, number] {
    if (!this?.parent?.children) {
      console.error("Block has no parent or parent has no children.");
      return [null, -1];
    }

    const idx = this.parent.children.findIndex((child) => child.id === this.id);
    return [this.parent, idx];
  }

  // [P1] @owner: 返り値が Block インスタンスではなくプレーンオブジェクト（スプレッド）になっている。
  // メソッド喪失のリスクがあるため、設計を統一（Block を返す or 呼び出し側で必ず createBlock で再構築）。
  updateBlockById(id: string, updatedBlock: Block): Block {
    if (this.id === id) {
      return updatedBlock;
    }

    if (this.children) {
      return {
        ...this,
        children: this.children.map((child) =>
          child.updateBlockById(id, updatedBlock),
        ),
      };
    }

    return this;
  }

  /**
   * Retrieve its descendant block by its id.
   *
   * NOTE: This function has a time complexity: O(the number of descendant blocks).
   * This is acceptable because the number of descendant blocks is expected to be small (< 1000)
   */
  getBlockById(id: string): Block | null {
    if (this.id === id) {
      return this;
    }

    for (let child of this.children) {
      const found = child.getBlockById(id);
      if (found) {
        return found;
      }
    }

    return null;
  }

  indent(): Block | null {
    // [P1] @owner: 本クラスは配列を直接 mutate（push/splice）している一方、状態更新側は再構築を行っている。
    // ミューテーション vs イミュータブルの方針を統一すること。
    const [parent, currentIdx] = this.getParentAndIndex();
    if (!parent || currentIdx === -1) {
      console.log("Block has no parent:", this);
      return parent;
    }

    if (currentIdx === 0) {
      console.log("Cannot indent block that is the first child of its parent.");
      return parent;
    }

    const siblingsBefore = parent.children.slice(0, currentIdx);
    const prevSibling = siblingsBefore[siblingsBefore.length - 1];
    if (!prevSibling) {
      console.log("No previous sibling to indent to.");
      return parent;
    }
    this.parent = prevSibling;
    prevSibling.children.push(this);

    const siblingsAfter = parent.children.slice(currentIdx + 1);
    parent.children = [...siblingsBefore, ...siblingsAfter];

    return parent;
  }

  outdent(): { parent: Block | null; grandParent: Block | null } {
    const [parent, currentIdx] = this.getParentAndIndex();
    if (!parent || currentIdx === -1) {
      console.log("Block has no parent:", this);
      return { parent, grandParent: null };
    }
    if (!parent.parent) {
      console.log("Cannot outdent block that is a child of the root.");
      return { parent, grandParent: null };
    }

    // [P3] @owner: 変数名は `grandparent` へ統一（キャメルケース&一貫性）。
    const [grandParent, parentIdx] = parent.getParentAndIndex();
    if (!grandParent || parentIdx === -1) {
      console.log("Parent has no parent:", parent);
      return { parent, grandParent };
    }

    const siblingsBefore = parent.children.slice(0, currentIdx);
    const siblingsAfter = parent.children.slice(currentIdx + 1);

    parent.children = siblingsBefore;
    this.parent = grandParent;
    // [P1] @owner: 現状の実装は「後続兄弟」を this の子に取り込むが、一般的なアウトライナでは
    // 対象ブロックのみを親の直後へ移動するのが期待挙動。仕様を見直すこと。
    this.children = [...this.children, ...siblingsAfter];
    this.children.forEach((b) => {
      b.parent = this;
    });

    grandParent.children[parentIdx] = parent;
    grandParent.children.splice(parentIdx + 1, 0, this);

    return { parent, grandParent };
  }

  toJSON(): BlockJSON {
    return {
      id: this.id,
      content: this.content,
      children:
        this.children?.length == 0
          ? undefined
          : this.children?.map((child) => child.toJSON()),
    };
  }
}

type BlockJSON = {
  id: string;
  content: string;
  children?: BlockJSON[];
};

function createBlock(obj: any): Block {
  const children = obj.children?.map(createBlock) || [];
  const block = new Block(obj.content, children).withParent(obj.parent);
  block.id = obj.id;
  return block;
}

export { createBlock };
