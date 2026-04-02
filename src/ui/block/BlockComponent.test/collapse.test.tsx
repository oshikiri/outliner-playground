import { fireEvent, screen, waitFor } from "@testing-library/preact";
import { describe, expect, it } from "vitest";

import BlockEntity from "../../../core/block/BlockEntity";
import { renderRootBlock } from "./testUtils";

describe("折りたたみ", () => {
  it("[OE-COLLAPSE-001] 子を持つ block のバレットをクリックすると折りたたみ状態へ切り替わりバレット表示も変わる", async () => {
    const child = new BlockEntity("child");
    const parent = new BlockEntity("parent", [child]);
    renderRootBlock(new BlockEntity("", [parent]));

    fireEvent.click(
      screen.getByRole("button", { name: "子ブロックを折りたたむ" }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "子ブロックを展開" }),
      ).toBeTruthy();
    });
  });

  it("[OE-COLLAPSE-002] 折りたたみ中は子 block を描画しない", async () => {
    const child = new BlockEntity("child");
    const parent = new BlockEntity("parent", [child]);
    renderRootBlock(new BlockEntity("", [parent]));

    fireEvent.click(
      screen.getByRole("button", { name: "子ブロックを折りたたむ" }),
    );

    await waitFor(() => {
      expect(screen.queryByText("child")).toBeNull();
    });
  });

  it("[OE-COLLAPSE-001] 折りたたみ済みのバレットをクリックすると展開状態へ戻りバレット表示も戻る", async () => {
    const child = new BlockEntity("child");
    const parent = new BlockEntity("parent", [child]);
    renderRootBlock(new BlockEntity("", [parent]));

    fireEvent.click(
      screen.getByRole("button", { name: "子ブロックを折りたたむ" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "子ブロックを展開" }));

    await waitFor(() => {
      expect(screen.getByText("child")).toBeTruthy();
      expect(
        screen.getByRole("button", { name: "子ブロックを折りたたむ" }),
      ).toBeTruthy();
    });
  });

  it("[OE-COLLAPSE-003] 子を持たない block は折りたたみ対象にしない", () => {
    renderRootBlock(new BlockEntity("", [new BlockEntity("leaf")]));

    expect(
      screen.queryByRole("button", { name: "子ブロックを折りたたむ" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "子ブロックを展開" }),
    ).toBeNull();
  });
});
