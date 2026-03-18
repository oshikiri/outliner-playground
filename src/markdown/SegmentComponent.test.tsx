import { cleanup, render, screen } from "@testing-library/preact";
import { afterEach, describe, expect, it } from "vitest";

import SegmentComponent from "./SegmentComponent";

afterEach(() => {
  cleanup();
});

describe("Block Markdown の描画ルール", () => {
  it("[BM-RENDER-001] plain text はそのまま文字列として描画する", () => {
    const { container } = render(
      <SegmentComponent segment={{ type: "text", value: "plain text" }} />,
    );

    expect(container.textContent).toBe("plain text");
    expect(container.querySelector("code")).toBeNull();
    expect(container.querySelector("a")).toBeNull();
  });

  it("[BM-RENDER-002] inline code は code 要素で描画する", () => {
    const { container } = render(
      <SegmentComponent segment={{ type: "code", value: "const x = 1" }} />,
    );

    const code = container.querySelector("code");
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe("const x = 1");
  });

  it("[BM-RENDER-003] link は a 要素で描画し target と rel を付与する", () => {
    render(
      <SegmentComponent
        segment={{ type: "link", value: "OpenAI", href: "https://openai.com" }}
      />,
    );

    const link = screen.getByRole("link", { name: "OpenAI" });
    expect(link.getAttribute("href")).toBe("https://openai.com");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noreferrer");
  });
});
