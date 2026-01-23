import { JSX, useMemo } from "preact/compat";

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
          // [P3] indexキーは差分更新で要素再利用がズレやすいため、安定キーを検討したい。
          key={`${segment.type}-${index}`}
          segment={segment}
        />
      ))}
    </>
  );
}
