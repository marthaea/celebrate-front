import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/bricolage-grotesque/latin-500.css";
import "@fontsource/bricolage-grotesque/latin-700.css";
import "./styles.css";
import App from "./App.jsx";
import { PlanProvider } from "../../src/plan.jsx";
import { LangProvider } from "./i18n.jsx";
import { CompareProvider } from "./compare.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <LangProvider>
        <PlanProvider>
          <CompareProvider>
            <App />
          </CompareProvider>
        </PlanProvider>
      </LangProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Lets the site be installed on a phone and opened without a connection. Only in the built site:
// while developing, saved copies would hide changes.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
