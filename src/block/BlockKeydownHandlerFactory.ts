import { KeyboardEvent } from "react";
import React from "react";
import BlockEntity from "./BlockEntity";
import * as dom from "./../dom";
import { getNewlineRangeList } from "../Range";
import type { CaretPosition } from "../state";

export class BlockKeydownHandlerFactory {
  constructor(
    private block: BlockEntity,
    private contentRef: React.RefObject<HTMLElement | null>,
    private getTextSegmentsAroundCaret: () => {
      beforeText: string | undefined;
      afterText: string | undefined;
      caretOffset: number;
    },
    private splitBlockAtCaret: (
      blockId: string,
      beforeText: string,
      afterText: string,
    ) => BlockEntity,
    private setCaretPosition: (position: CaretPosition | null) => void,
    private updateBlockById: (blockId: string, block: BlockEntity) => void,
  ) {}

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
    const { beforeText, afterText } = this.getTextSegmentsAroundCaret();
    const newBlock = this.splitBlockAtCaret(
      this.block.id,
      beforeText || "",
      afterText || "",
    );
    this.setCaretPosition({ blockId: newBlock.id, caretOffset: 0 });
  }

  private handleTab(event: KeyboardEvent, currentInnerText: string) {
    event.preventDefault();
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

    const { caretOffset } = this.getTextSegmentsAroundCaret();
    this.setCaretPosition({ blockId: this.block.id, caretOffset });
  }

  private handleArrowDown(
    event: KeyboardEvent,
    currentElement: HTMLElement | null,
    currentInnerText: string,
  ) {
    if (!currentElement || !dom.isCaretAtLastLine(this.block.content)) {
      return;
    }

    event.preventDefault();
    const nextBlock = this.block.getNextBlock();
    if (!nextBlock) {
      return;
    }

    this.block.content = currentInnerText;
    this.updateBlockById(this.block.id, this.block);

    const caretOffset = dom.getCurrentLineOffset(currentElement);
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
    if (!currentElement || !dom.isCaretAtFirstLine()) {
      return;
    }

    event.preventDefault();
    const prevBlock = this.block.getPrevBlock();
    if (!prevBlock) {
      return;
    }

    this.block.content = currentInnerText;
    this.updateBlockById(this.block.id, this.block);

    const offsetAtPrev = dom.getCurrentLineOffset(currentElement);
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
    this.block.content = currentInnerText;

    if (this.block.children.length > 0 || !dom.caretIsAtBlockStart()) {
      return;
    }

    const prevBlock = this.block.getPrevBlock();
    if (!prevBlock) {
      return;
    }

    event.preventDefault();
    const prevContentLength = prevBlock.content.length;
    prevBlock.content += this.block.content;
    const [parent, idx] = this.block.getParentAndIndex();
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
    if (!dom.caretIsAtBlockStart()) {
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
    const position = dom.getCaretPositionInBlock(window.getSelection());
    if (!position) {
      return;
    }
    if (position.anchorOffset != position.wholeText?.length) {
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
