import { createContext, useCallback, useContext, useMemo, useState } from "react";

const CompareContext = createContext(null);
export const COMPARE_LIMIT = 3;

/** Remembers up to three services the customer has ticked to compare side by side. */
export function CompareProvider({ children }) {
  const [ids, setIds] = useState([]);
  const toggle = useCallback(
    (id) => setIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : list.length < COMPARE_LIMIT ? [...list, id] : list)),
    []
  );
  const clear = useCallback(() => setIds([]), []);
  const value = useMemo(() => ({ ids, toggle, clear }), [ids, toggle, clear]);
  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export const useCompare = () => useContext(CompareContext);
