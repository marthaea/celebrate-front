// /sitemap.xml and /robots.txt for the hosted site, shared by the Netlify edge function
// (netlify/edge-functions/sitemap.js) and the Cloudflare Pages functions (functions/).
// The list of services comes from the live API through the site's own /api, so new vendors' services
// are included; every address uses the site's own domain, which Google requires for a sitemap.
import { renderRobots, renderSitemap } from "./seoText.js";
import { SERVICES } from "../../server/data.js";

export async function sitemapOrRobots(request, siteUrl) {
  const url = new URL(request.url);
  const origin = (siteUrl || url.origin).replace(/\/$/, "");
  if (url.pathname === "/robots.txt") {
    return new Response(renderRobots(origin), { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
  }
  let services = SERVICES;
  try {
    const live = await fetch(`${url.origin}/api/services`, { headers: { accept: "application/json" } });
    if (live.ok) {
      const list = await live.json();
      if (Array.isArray(list) && list.length) services = list;
    }
  } catch {
    // The sample catalogue is listed instead.
  }
  return new Response(renderSitemap(origin, services), { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
