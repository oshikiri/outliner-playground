import { Fragment, JSX } from "preact/compat";

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

/**
 * Sanitize a link href by stripping control/whitespace and allowing safe schemes only.
 */
function sanitizeHref(href: string): string {
  const trimmed = href.trim();
  const normalized = trimmed.replace(/[\u0000-\u001f\u007f\s]+/g, "");
  if (normalized === "") {
    return "#";
  }
  const lower = normalized.toLowerCase();
  const schemeMatch = /^[a-z][a-z0-9+.-]*:/.exec(lower);
  if (schemeMatch) {
    const scheme = schemeMatch[0].slice(0, -1);
    const allowedSchemes = ["http", "https"];
    if (!allowedSchemes.includes(scheme)) {
      return "#";
    }
  }
  return normalized;
}
