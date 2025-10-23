import Block from "./BlockEntity";

const initialPage = new Block("", [
  new Block("This is a playground for outliner-playground"),
  new Block(""),
  new Block("outliner-playground is a study of logseq-like outliner editors", [
    new Block("This project aims to learn React, Zustand, and Tailwind CSS"),
  ]),
  new Block("Features", [
    new Block("Create, edit, and delete blocks"),
    new Block("State management", [
      new Block(
        "You can update the nested items and see the current state in the right pane",
      ),
    ]),
    new Block("logseq-like keybinds", [
      new Block("tab: increase level"),
      new Block("shift+tab: decrease level"),
      new Block("enter: add new block after the current block", [
        new Block(
          "Add a new sibling block if the current block has no children, or add a new child block if it does",
        ),
        new Block("The cursor will move to the new block"),
      ]),
      new Block("shift+enter: insert a newline"),
      new Block("arrow up/down: move to the previous/next visual line", [
        new Block(
          '"The next visual line" is the line that appears immediately below the current line as displayed on the screen, taking into account text wrapping. ',
          [
            new Block(
              "If the current line is the last visual line of the block, go to the first line of the next block.",
            ),
            new Block(
              "Otherwise, go to the next visual line of the current block.",
            ),
          ],
        ),
        new Block("And it preserves the cursor position"),
      ]),
      new Block("ctrl+a: move cursor to the beginning of the line"),
      new Block("ctrl+e: move cursor to the end of the line"),
      new Block("ctrl+k: clear the localStorage"),
    ]),
  ]),
]);

export { initialPage };
