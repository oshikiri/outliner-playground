type LogArgs = unknown[];

function isDebugEnabled(): boolean {
  return import.meta.env.DEV;
}

export function log(...args: LogArgs): void {
  console.log(...args);
}

export function warn(...args: LogArgs): void {
  console.warn(...args);
}

export function error(...args: LogArgs): void {
  console.error(...args);
}

export function debug(...args: LogArgs): void {
  if (!isDebugEnabled()) {
    return;
  }

  console.debug(...args);
}
