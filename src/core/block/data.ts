import type { BlockTreeLike } from "../../block/blockStore";

export const initialRootBlock: BlockTreeLike = {
  id: crypto.randomUUID(),
  content: "",
  children: [
    {
      id: crypto.randomUUID(),
      content: "This is a playground for outliner-playground",
    },
    {
      id: crypto.randomUUID(),
      content: "",
    },
    {
      id: crypto.randomUUID(),
      content: "outliner-playground is a study of logseq-like outliner editors",
      children: [
        {
          id: crypto.randomUUID(),
          content: "This project aims to learn React, Jotai, and Tailwind CSS",
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      content: "Features",
      children: [
        {
          id: crypto.randomUUID(),
          content: "Create, edit, and delete blocks",
        },
        {
          id: crypto.randomUUID(),
          content: "State management",
          children: [
            {
              id: crypto.randomUUID(),
              content:
                "You can update the nested items and see the current state in the right pane",
            },
          ],
        },
        {
          id: crypto.randomUUID(),
          content: "Markdown rendering",
          children: [
            {
              id: crypto.randomUUID(),
              content: "[link example](https://example.com)",
            },
            {
              id: crypto.randomUUID(),
              content: "`inline code` example",
            },
          ],
        },
        {
          id: crypto.randomUUID(),
          content: "logseq-like keybinds",
          children: [
            {
              id: crypto.randomUUID(),
              content: "`tab`: increase level",
            },
            {
              id: crypto.randomUUID(),
              content: "`shift+tab`: decrease level",
            },
            {
              id: crypto.randomUUID(),
              content: "`enter`: add new block after the current block",
              children: [
                {
                  id: crypto.randomUUID(),
                  content:
                    "Add a new sibling block if the current block has no children, or add a new child block if it does",
                },
                {
                  id: crypto.randomUUID(),
                  content: "The cursor will move to the new block",
                },
              ],
            },
            {
              id: crypto.randomUUID(),
              content: "`shift+enter`: insert a newline",
            },
            {
              id: crypto.randomUUID(),
              content: "`arrow up/down`: move to the previous/next visual line",
              children: [
                {
                  id: crypto.randomUUID(),
                  content:
                    '"The next visual line" is the line that appears immediately below the current line as displayed on the screen, taking into account text wrapping. ',
                  children: [
                    {
                      id: crypto.randomUUID(),
                      content:
                        "If the current line is the last visual line of the block, go to the first line of the next block.",
                    },
                    {
                      id: crypto.randomUUID(),
                      content:
                        "Otherwise, go to the next visual line of the current block.",
                    },
                  ],
                },
                {
                  id: crypto.randomUUID(),
                  content: "And it preserves the cursor position",
                },
              ],
            },
            {
              id: crypto.randomUUID(),
              content: "`ctrl+a`: move cursor to the beginning of the line",
            },
            {
              id: crypto.randomUUID(),
              content: "`ctrl+e`: move cursor to the end of the line",
            },
            {
              id: crypto.randomUUID(),
              content: "`ctrl+k`: reset to the initial data",
            },
          ],
        },
      ],
    },
    {
      id: crypto.randomUUID(),
      content: "TODOs",
      children: [
        {
          id: crypto.randomUUID(),
          content: "Caret movement across visual lines",
        },
        {
          id: crypto.randomUUID(),
          content: "Copy/paste handling (rich text -> plain text)",
        },
        {
          id: crypto.randomUUID(),
          content: "Undo/redo functionality",
        },
      ],
    },
  ],
};
