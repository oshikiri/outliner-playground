import type { JSX } from "preact";
import { useMemo } from "preact/hooks";

import parseInlineMarkdown from "../core/markdown/parseInlineMarkdown";
import SegmentComponent from "./SegmentComponent";

type MarkdownComponentProps = {
  raw: string;
};

export default function MarkdownComponent({
  raw,
}: MarkdownComponentProps): JSX.Element {
  const segments = useMemo(() => parseInlineMarkdown(raw), [raw]);
  const seenSignatures = new Map<string, number>();

  return (
    <>
      {segments.map((segment) => {
        const signature =
          segment.type === "link"
            ? `${segment.type}:${segment.value}:${segment.href}`
            : `${segment.type}:${segment.value}`;

        const occurrence = seenSignatures.get(signature) ?? 0;
        seenSignatures.set(signature, occurrence + 1);

        return (
          <SegmentComponent
            key={`${signature}:${occurrence}`}
            segment={segment}
          />
        );
      })}
    </>
  );
}
