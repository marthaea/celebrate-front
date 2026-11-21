import { useEffect, useState } from "react";

/**
 * The API's answer as JSON. If /api is not connected to the server where the site is hosted, the host
 * answers with its own page (HTML, or a plain "Not found") instead; that is said plainly rather than
 * shown as an empty page or a vague "Something went wrong".
 */
export async function readBody(response) {
  const json = (response.headers.get("content-type") ?? "").includes("json");
  const body = json ? await response.json().catch(() => null) : null;
  if (!json && response.status !== 204) {
    console.error(`[api] ${response.url} answered ${response.status} ${response.headers.get("content-type") ?? ""}, not JSON: /api is not reaching the server.`);
    throw new Error("Celebrate cannot reach its server right now. Please try again in a few minutes.");
  }
  return body;
}

async function request(path, options) {
  let response;
  try {
    response = await fetch(`/api${path}`, options);
  } catch {
    throw new Error("We could not reach the server. Check your connection and try again.");
  }
  const body = await readBody(response);
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
