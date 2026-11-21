import { readBody } from "../../src/api.js";
// Signing in as a vendor or as the admin, and the calls those interfaces make.
// The sign-in lasts for the browser tab: closing it signs you out.
const KEY = "celebrate.staff.v1";

export const session = {
  get(role) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY));
      return saved?.role === role ? saved : null;
    } catch {
      return null;
    }
  },
  set(value) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      // Signed in for this page view only.
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // Nothing to clear.
    }
  },
};

export class SignedOut extends Error {}

async function request(path, data, token) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method: data ? "POST" : "GET",
      headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
      body: data && JSON.stringify(data),
    });
  } catch {
    throw new Error("We could not reach the server. Check your connection and try again.");
  }
  const body = await readBody(response);
  if (response.status === 401 && token) throw new SignedOut(body?.error ?? "Please sign in again.");
  if (!response.ok) throw new Error(body?.error ?? "Something went wrong. Please try again.");
  return body;
}

export const staff = {
  login: (data) => request("/staff/login", data),
  apply: (data) => request("/vendors/apply", data),
  /** Calls made as whoever is signed in: staffCall(session)("/vendor/overview"). */
  as: (who) => (path, data) => request(path, data, who.token),
};
