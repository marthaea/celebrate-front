import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/noto-sans/latin-400.css";
import "@fontsource/noto-sans/latin-600.css";
import "@fontsource/noto-sans/latin-700.css";
import "@fontsource/fredoka/latin-700.css";
import "./styles.css";
import App from "./App.jsx";
import { PlanProvider } from "./plan.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <PlanProvider>
        <App />
      </PlanProvider>
    </BrowserRouter>
  </React.StrictMode>
);
