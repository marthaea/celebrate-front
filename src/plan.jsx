import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toISODate } from "./format.js";

const STORAGE_KEY = "celebrate.plan.v1";

function defaultEvent() {
  // Four Saturdays from now is a sensible starting date.
  const date = new Date();
  date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7) + 21);
  return { type: "Kwanjula", guests: 250, tents: 6, date: toISODate(date), district: "Mukono", setup: "vendor" };
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.items) && saved.event) {
      const event = { ...defaultEvent(), ...saved.event };
      if (event.date < toISODate(new Date())) event.date = defaultEvent().date;
      return { name: saved.name ?? "", items: saved.items, event };
    }
  } catch {
    // Storage can be blocked or hold something unreadable; start fresh.
  }
  return { name: "", items: [], event: defaultEvent() };
}

const PlanContext = createContext(null);

export function PlanProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The plan still works for this visit without storage.
    }
  }, [state]);

  const setName = useCallback((name) => setState((s) => ({ ...s, name })), []);
  const setEvent = useCallback((patch) => setState((s) => ({ ...s, event: { ...s.event, ...patch } })), []);
  const addItem = useCallback((id) => setState((s) => (s.items.includes(id) ? s : { ...s, items: [...s.items, id] })), []);
  const removeItem = useCallback((id) => setState((s) => ({ ...s, items: s.items.filter((item) => item !== id) })), []);
  const clearItems = useCallback(() => setState((s) => ({ ...s, items: [] })), []);

  const value = useMemo(
    () => ({ ...state, setName, setEvent, addItem, removeItem, clearItems }),
    [state, setName, setEvent, addItem, removeItem, clearItems]
  );
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export const usePlan = () => useContext(PlanContext);
