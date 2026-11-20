// Each service's settings in the plan (menu, tiers, hours…), kept in this browser alongside the
// plan itself. The plan's list of services is shared with the earlier phone-app version, which
// has no settings, so they live here rather than in src/plan.jsx.
import { useCallback, useEffect, useState } from "react";

const KEY = "celebrate.choices.v1";
const listeners = new Set();

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

export function readChoices() {
  return load();
}

export function setChoicesFor(serviceId, value) {
  const next = { ...load(), [serviceId]: value };
  if (!value) delete next[serviceId];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Settings last for this visit only.
  }
  listeners.forEach((listener) => listener(next));
}

/** All saved settings, kept up to date as they change anywhere on the page. */
export function useChoices() {
  const [choices, setChoices] = useState(load);
  useEffect(() => {
    listeners.add(setChoices);
    return () => listeners.delete(setChoices);
  }, []);
  const set = useCallback((serviceId, value) => setChoicesFor(serviceId, value), []);
  return [choices, set];
}

/** Only the settings for the services in a plan, ready to send with a quote or booking. */
export const choicesForItems = (choices, items) => Object.fromEntries(items.filter((id) => choices[id]).map((id) => [id, choices[id]]));
