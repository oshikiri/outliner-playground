import { KeyboardEvent } from "react";
import React from "react";
import BlockEntity from "./BlockEntity";
import * as dom from "./../dom";
import { getNewlineRangeList } from "../Range";
import type { UpdateCaretPosition } from "../state";

// @owner [P1] このFactoryは毎レンダーごとにインスタンス化され大量のハンドラーを再生成するため、クラス構造よりhooksベースのメモ化が望ましいです
export class BlockKeydownHandlerFactory {
  constructor(
    private block: BlockEntity,
    private contentRef: React.RefObject<HTMLElement | null>,
    private getTextSegmentsAroundCaret: (selection: Selection | null) => {
      beforeText: string | undefined;
      afterText: string | undefined;
      caretOffset: number;
    },
    private splitBlockAtCaret: (
      blockId: string,
      beforeText: string,
      afterText: string,
    ) => BlockEntity,
    private setCaretPosition: (updateFn: UpdateCaretPosition) => void,
    private updateBlockById: (blockId: string, block: BlockEntity) => void,
  ) {}

  // @owner [P1] ここで返す関数は毎回新規生成されuseEffect等の依存に含めにくい構造です
  public generate(): React.KeyboardEventHandler {
    return (event: KeyboardEvent) => {
      const currentElement = this.contentRef.current;
      const currentInnerText: string = currentElement?.innerText || "";

      if (event.key === "Enter" && !event.shiftKey) {
        this.handleEnter(event, currentInnerText);
      } else if (event.key === "Tab") {
        this.handleTab(event, currentInnerText);
      } else if (event.key === "ArrowDown") {
        this.handleArrowDown(event, currentElement, currentInnerText);
      } else if (event.key === "ArrowUp") {
        this.handleArrowUp(event, currentElement, currentInnerText);
      } else if (event.key === "ArrowLeft") {
        this.handleArrowLeft(event);
      } else if (event.key === "ArrowRight") {
        this.handleArrowRight(event);
      } else if (event.key === "a" && event.ctrlKey) {
        this.goToLineStart(event);
      } else if (event.key === "e" && event.ctrlKey) {
        this.goToLineEnd(event, currentInnerText);
      } else if (event.key === "Backspace") {
        this.handleBackspace(event, currentInnerText);
      }
    };
  }

  private handleEnter(event: KeyboardEvent, currentInnerText: string) {
    event.preventDefault();
    const { beforeText, afterText } = this.getTextSegmentsAroundCaret(
      window.getSelection(),
    );
    const newBlock = this.splitBlockAtCaret(
      this.block.id,
      beforeText || "",
      afterText || "",
    );
    this.setCaretPosition({ blockId: newBlock.id, caretOffset: 0 });
  }

  private handleTab(event: KeyboardEvent, currentInnerText: string) {
    event.preventDefault();
    // @owner [P1] BlockEntityを直接ミューテート
    this.block.content = currentInnerText;
    this.updateBlockById(this.block.id, this.block);

    if (event.shiftKey) {
      const { parent, grandparent } = this.block.outdent();
      if (parent) {
        this.updateBlockById(parent.id, parent);
      }
      if (grandparent) {
        this.updateBlockById(grandparent.id, grandparent);
      }
    } else {
      const parent = this.block.indent();
      if (parent) {
        this.updateBlockById(parent.id, parent);
      }
    }

    const { caretOffset } = this.getTextSegmentsAroundCaret(
      window.getSelection(),
    );
    this.setCaretPosition({ blockId: this.block.id, caretOffset });
  }

  private handleArrowDown(
    event: KeyboardEvent,
    currentElement: HTMLElement | null,
    currentInnerText: string,
  ) {
    if (
      !currentElement ||
      !dom.isCaretAtLastLine(this.block.content, window.getSelection())
    ) {
      return;
    }

    event.preventDefault();
    const nextBlock = this.block.getNextBlock();
    if (!nextBlock) {
      return;
    }

    // @owner [P1] ミューテーション
    this.block.content = currentInnerText;
    this.updateBlockById(this.block.id, this.block);

    const caretOffset = dom.getCurrentLineOffset(
      currentElement,
      window.getSelection(),
    );
    const lastRange = getNewlineRangeList(this.block.content).getLastRange();
    const nextCaretOffset = lastRange
      ? Math.max(0, caretOffset - lastRange.l - 1)
      : 0;
    this.setCaretPosition({
      blockId: nextBlock.id,
      caretOffset: nextCaretOffset,
    });
  }

  private handleArrowUp(
    event: KeyboardEvent,
    currentElement: HTMLElement | null,
    currentInnerText: string,
  ) {
    if (!currentElement || !dom.isCaretAtFirstLine(window.getSelection())) {
      return;
    }

    event.preventDefault();
    const prevBlock = this.block.getPrevBlock();
    if (!prevBlock) {
      return;
    }

    // @owner [P1] ミューテーション
    this.block.content = currentInnerText;
    this.updateBlockById(this.block.id, this.block);

    const offsetAtPrev = dom.getCurrentLineOffset(
      currentElement,
      window.getSelection(),
    );
    const lastRange = getNewlineRangeList(prevBlock.content).getLastRange();
    const nextCaretOffset = lastRange
      ? Math.min(lastRange.l + offsetAtPrev + 1, lastRange.r)
      : 0;
    this.setCaretPosition({
      blockId: prevBlock.id,
      caretOffset: nextCaretOffset,
    });
  }

  private goToLineStart(event: KeyboardEvent) {
    event.preventDefault();

    // @owner [P1] window APIへ強依存しSSR/テストで扱いにくい
    const pos = dom.getCaretPositionInBlock(window.getSelection());
    const newlineBeforeCaret = pos?.newlines?.findLast((newline: any) => {
      return newline.index < pos.anchorOffset;
    });
    if (newlineBeforeCaret) {
      const newlineIndex = newlineBeforeCaret.index;
      this.setCaretPosition({
        blockId: this.block.id,
        caretOffset: newlineIndex + 1,
      });
    } else {
      this.setCaretPosition({ blockId: this.block.id, caretOffset: 0 });
    }
  }

  private goToLineEnd(event: KeyboardEvent, currentInnerText: string) {
    event.preventDefault();

    // @owner [P1] window依存
    const pos = dom.getCaretPositionInBlock(window.getSelection());
    const newlineAfterCaret = pos?.newlines?.find((newline: any) => {
      return newline.index >= pos.anchorOffset;
    });
    if (newlineAfterCaret) {
      const newlineIndex = newlineAfterCaret.index;
      this.setCaretPosition({
        blockId: this.block.id,
        caretOffset: newlineIndex,
      });
    } else {
      this.setCaretPosition({
        blockId: this.block.id,
        caretOffset: currentInnerText.length,
      });
    }
  }

  private handleBackspace(event: KeyboardEvent, currentInnerText: string) {
    // @owner [P1] ミューテーション
    this.block.content = currentInnerText;

    if (
      this.block.children.length > 0 ||
      !dom.caretIsAtBlockStart(window.getSelection())
    ) {
      return;
    }

    const prevBlock = this.block.getPrevBlock();
    if (!prevBlock) {
      return;
    }

    event.preventDefault();
    const prevContentLength = prevBlock.content.length;
    // @owner [P1] ここでも破壊的変更
    prevBlock.content += this.block.content;
    const [parent, idx] = this.block.getParentAndIndex();
    // @owner [P1] children配列を直接splice
    parent?.children.splice(idx, 1);

    this.updateBlockById(prevBlock.id, prevBlock);
    if (parent) {
      this.updateBlockById(parent.id, parent);
    }

    this.setCaretPosition({
      blockId: prevBlock.id,
      caretOffset: prevContentLength,
    });
  }

  private handleArrowLeft(event: KeyboardEvent) {
    if (!dom.caretIsAtBlockStart(window.getSelection())) {
      return;
    }

    event.preventDefault();
    const prevBlock = this.block.getPrevBlock();
    if (!prevBlock) {
      return;
    }

    this.setCaretPosition({
      blockId: prevBlock.id,
      caretOffset: prevBlock.content.length,
    });
  }

  private handleArrowRight(event: KeyboardEvent) {
    // @owner [P1] window依存
    const position = dom.getCaretPositionInBlock(window.getSelection());
    if (!position) {
      return;
    }
    if (position.anchorOffset !== position.wholeText?.length) {
      return;
    }

    event.preventDefault();
    const nextBlock = this.block.getNextBlock();
    if (!nextBlock) {
      return;
    }

    this.setCaretPosition({ blockId: nextBlock.id, caretOffset: 0 });
  }
}
