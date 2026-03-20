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

  it("[BM-RENDER-004] link の href は描画前に空白文字と制御文字を除去して正規化する", () => {
    render(
      <SegmentComponent
        segment={{
          type: "link",
          value: "OpenAI",
          href: " \nhttps://openai.com/\tpath\u0000 ",
        }}
      />,
    );

    const link = screen.getByRole("link", { name: "OpenAI" });
    expect(link.getAttribute("href")).toBe("https://openai.com/path");
  });

  it.each([
    "http://example.com",
    "https://example.com",
    "/path",
    "foo/bar",
    "?query",
    "#fragment",
    "//example.com/path",
  ])("[BM-RENDER-005] 許可された href %s はそのまま描画する", (href) => {
    render(
      <SegmentComponent segment={{ type: "link", value: "OpenAI", href }} />,
    );

    const link = screen.getByRole("link", { name: "OpenAI" });
    expect(link.getAttribute("href")).toBe(href);
  });

  it.each(["javascript:alert(1)", "mailto:test@example.com", " \n\t\u0000 "])(
    '[BM-RENDER-006] 非許可の href %s は "#" に置き換える',
    (href) => {
      render(
        <SegmentComponent segment={{ type: "link", value: "OpenAI", href }} />,
      );

      const link = screen.getByRole("link", { name: "OpenAI" });
      expect(link.getAttribute("href")).toBe("#");
    },
  );
});
