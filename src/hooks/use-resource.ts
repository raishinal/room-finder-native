import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
export function useResource<T>(path: string | null) {
  const [result, setResult] = useState<{
    key: string;
    data?: T;
    error?: unknown;
  }>();
  const [revision, setRevision] = useState(0);
  const key = `${path}:${revision}`;
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    const abort = new AbortController();
    if (!path) return;
    api<T>(path, "GET", undefined, abort.signal)
      .then((data) => {
        if (!abort.signal.aborted) setResult({ key, data });
      })
      .catch((error) => {
        if (!abort.signal.aborted) setResult({ key, error });
      });
    return () => abort.abort();
  }, [path, key]);
  return {
    data: result?.key === key ? result.data : undefined,
    error: result?.key === key ? result.error : undefined,
    loading: !!path && result?.key !== key,
    reload,
  };
}
