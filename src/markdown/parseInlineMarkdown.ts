import type { Segment } from "./Segment";

/**
 * Very rough inline markdown parser
 */
export default function parseInlineMarkdown(raw: string): Segment[] {
  const segments: Segment[] = [];
  const pattern = /(`[^`]*`|\[[^\]]+]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: raw.slice(lastIndex, match.index),
      });
    }

    segments.push(parseMatchedSegment(match[0]));
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < raw.length) {
    segments.push({ type: "text", value: raw.slice(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ type: "text", value: raw });
  }

  return segments;
}

function parseMatchedSegment(token: string): Segment {
  if (token.startsWith("`")) {
    return { type: "code", value: token.slice(1, -1) };
  }

  const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (linkMatch) {
    return {
      type: "link",
      value: linkMatch[1],
      href: linkMatch[2],
    };
  }

  return { type: "text", value: token };
}
