import { beforeEach, describe, expect, it, vi } from "vitest";

import { debug, error, log, warn } from "./logger";

describe("logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("delegates log calls to console.log", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    log("message", { value: 1 });

    expect(spy).toHaveBeenCalledWith("message", { value: 1 });
  });

  it("delegates warn calls to console.warn", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    warn("message", { value: 1 });

    expect(spy).toHaveBeenCalledWith("message", { value: 1 });
  });

  it("delegates error calls to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    error("message", { value: 1 });

    expect(spy).toHaveBeenCalledWith("message", { value: 1 });
  });

  it("delegates debug calls to console.debug in development", () => {
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});

    debug("message", { value: 1 });

    if (import.meta.env.DEV) {
      expect(spy).toHaveBeenCalledWith("message", { value: 1 });
      return;
    }

    expect(spy).not.toHaveBeenCalled();
  });
});
