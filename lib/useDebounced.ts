"use client";

import { useEffect, useState } from "react";

/** The value, but only after it has stopped changing for `ms`. Used so typing in a search box asks the server once, not per key. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
