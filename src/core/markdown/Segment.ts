export type Segment =
  | {
      type: "text";
      value: string;
    }
  | {
      type: "code";
      value: string;
    }
  | {
      type: "link";
      value: string;
      href: string;
    };
