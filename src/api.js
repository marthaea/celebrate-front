import { useEffect, useState } from "react";

async function request(path, options) {
  let response;
  try {
    response = await fetch(`/api${path}`, options);
  } catch {
    throw new Error("We could not reach the server. Check your connection and try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error ?? "Something went wrong. Please try again.");
  return body;
}

const post = (path, data) =>
  request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });

export const api = {
  meta: () => request("/meta"),
  services: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
    return request(`/services?${query}`);
  },
  service: (id) => request(`/services/${encodeURIComponent(id)}`),
  offers: () => request("/offers"),
  quote: (event, items) => post("/quote", { event, items }),
  book: (data) => post("/bookings", data),
  bookings: () => request("/bookings"),
  booking: (id) => request(`/bookings/${encodeURIComponent(id)}`),
};

/** Loads data when `deps` change. Returns { data, error, loading }. */
export function useLoad(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    let current = true;
    setState((previous) => ({ ...previous, error: null, loading: true }));
    loader()
      .then((data) => current && setState({ data, error: null, loading: false }))
      .catch((error) => current && setState({ data: null, error: error.message, loading: false }));
    return () => {
      current = false;
    };
  }, deps);
  return state;
}
