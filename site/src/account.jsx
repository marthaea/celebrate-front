import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// The signed-in customer, kept in this browser for 30 days (the server's token lasts as long).
const KEY = "celebrate.customer.v1";

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved?.token && saved?.customer ? saved : null;
  } catch {
    return null;
  }
}

/** The token to send with requests, read fresh each time so every call sees the latest sign-in. */
export const customerToken = () => load()?.token ?? null;

const AccountContext = createContext({ customer: null });

export function AccountProvider({ children }) {
  const [session, setSession] = useState(load);

  const remember = useCallback((next) => {
    try {
      if (next) localStorage.setItem(KEY, JSON.stringify(next));
      else {
        localStorage.removeItem(KEY);
        // What this browser kept for the account goes with it.
        localStorage.removeItem("celebrate.bookings.v1");
      }
    } catch {
      // Signed in for this visit only.
    }
    setSession(next);
  }, []);

  // Checks the saved sign-in is still good, and picks up changes made elsewhere (a new name, a suspension).
  useEffect(() => {
    if (!session) return;
    fetch("/api/me", { headers: { Authorization: `Bearer ${session.token}` } })
      .then((response) => {
        if (response.status === 401) remember(null);
        return response.ok ? response.json() : null;
      })
      .then((customer) => customer && remember({ ...session, customer }))
      .catch(() => {
        // Offline: keep the saved sign-in.
      });
  }, [session?.token]);

  const value = useMemo(
    () => ({
      customer: session?.customer ?? null,
      signIn: (result) => remember(result),
      signOut: () => remember(null),
      update: (customer) => remember({ ...session, customer }),
    }),
    [session, remember]
  );
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export const useAccount = () => useContext(AccountContext);
