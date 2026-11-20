// Keeps the page's <head> right as people move around inside the app (the server writes it for
// the first page; see seoText.js).
import { useEffect } from "react";
import { pageMeta, renderHead } from "./seoText.js";

const MANAGED = 'title, meta[name="description"], meta[name="keywords"], meta[name="robots"], link[rel="canonical"], meta[property^="og:"], meta[name^="twitter:"], script[type="application/ld+json"]';

export function applyHead(meta) {
  document.head.querySelectorAll(MANAGED).forEach((node) => node.remove());
  const holder = document.createElement("template");
  holder.innerHTML = renderHead(meta, window.location.origin);
  document.head.append(holder.content);
}

/** Sets the head for a page. Pass `extra.service` on a service page once it has loaded. */
export function useSeo(pathname, extra, ready = true) {
  useEffect(() => {
    if (ready) applyHead(pageMeta(pathname, extra));
  }, [pathname, ready, extra?.service?.id]);
}
