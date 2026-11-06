import { useEffect, useState } from 'react';

/** Returns `value` once it has stopped changing for `ms`, so typing in a search box sends one request, not one per key. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
