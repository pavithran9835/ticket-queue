import { useCallback, useEffect, useState } from "react";

export type AsyncState<T> =
  | { status: "loading"; data?: T }
  | { status: "success"; data: T }
  | { status: "error"; error: Error; data?: T };

/**
 * Runs `load` whenever `deps` change, cancelling the previous request so a slow, stale response
 * can never overwrite a newer one. `reload()` re-runs it on demand (e.g. a Retry button).
 */
export function useAsync<T>(load: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ status: "loading", data: prev.data }));
    load(controller.signal).then(
      (data) => !controller.signal.aborted && setState({ status: "success", data }),
      (error: Error) => !controller.signal.aborted && setState({ status: "error", error }),
    );
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  return { state, setState, reload };
}
