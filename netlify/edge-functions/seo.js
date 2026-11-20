// Writes each page's title, description, share image and structured data into the page as Netlify
// serves it, so Google and link previews (WhatsApp, Facebook, X) see the right ones for every
// address, including services vendors add later.
import { injectHead, pageMeta, renderHead } from "../../site/src/seoText.js";

export default async (request, context) => {
  const response = await context.next();
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) return response;
  const url = new URL(request.url);
  let service;
  const id = url.pathname.match(/^\/service\/([^/]+)$/)?.[1];
  if (id) {
    try {
      const found = await fetch(`${url.origin}/api/services/${id}`);
      if (found.ok) service = await found.json();
    } catch {
      // The sample catalogue's details are used instead.
    }
  }
  const env = globalThis.Netlify?.env;
  const origin = (env?.get("SITE_URL") || url.origin).replace(/\/$/, "");
  const head = renderHead(pageMeta(url.pathname, { service }), origin, { verification: env?.get("GOOGLE_SITE_VERIFICATION") });
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(injectHead(await response.text(), head), { status: response.status, headers });
};

export const config = {
  path: "/*",
  excludedPath: ["/api/*", "/assets/*", "/photos/*", "/icons/*", "/og/*", "/team/*", "/sitemap.xml", "/robots.txt", "/sw.js", "/favicon.svg", "/manifest.webmanifest"],
};
