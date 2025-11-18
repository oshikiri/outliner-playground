import { JSX, useMemo } from "react";

import SegmentComponent from "./SegmentComponent";
import parseInlineMarkdown from "./parseInlineMarkdown";

type MarkdownComponentProps = {
  raw: string;
};

export default function MarkdownComponent({
  raw,
}: MarkdownComponentProps): JSX.Element {
  const segments = useMemo(() => parseInlineMarkdown(raw), [raw]);

  return (
    <>
      {segments.map((segment, index) => (
        <SegmentComponent
          key={`${segment.type}-${index}`}
          segment={segment}
          index={index}
        />
      ))}
    </>
  );
}
