import { Fragment, JSX } from "react";

import type { Segment } from "./Segment";

type SegmentProps = {
  segment: Segment;
};

export default function SegmentComponent({
  segment,
}: SegmentProps): JSX.Element {
  if (segment.type === "code") {
    return <CodeSegment value={segment.value} />;
  }

  if (segment.type === "link") {
    return <LinkSegment label={segment.value} href={segment.href} />;
  }

  return <Fragment>{segment.value}</Fragment>;
}

type CodeSegmentProps = {
  value: string;
};

function CodeSegment({ value }: CodeSegmentProps): JSX.Element {
  return (
    <code className="rounded bg-slate-200 px-1 font-mono text-sm">
      {value || "\u00a0"}
    </code>
  );
}

type LinkSegmentProps = {
  label: string;
  href: string;
};

function LinkSegment({ label, href }: LinkSegmentProps): JSX.Element {
  return (
    <a
      className="text-blue-600 underline"
      href={sanitizeHref(href)}
      rel="noreferrer"
      target="_blank"
    >
      {label}
    </a>
  );
}

function sanitizeHref(href: string): string {
  const trimmed = href.trim();
  // @owner [P1] FIXME: Basic XSS prevention by sanitizing javascript: links
  return trimmed.toLowerCase().startsWith("javascript:") ? "#" : trimmed;
}
