// /sitemap.xml and /robots.txt, written for this site's own address (see site/src/sitemapRoute.js).
// Serving them here, rather than passing on the API's own files, keeps every address on the site's
// domain, which Google requires for a sitemap.
import { sitemapOrRobots } from "../../site/src/sitemapRoute.js";

export default (request) => sitemapOrRobots(request, globalThis.Netlify?.env?.get("SITE_URL"));

export const config = { path: ["/sitemap.xml", "/robots.txt"] };
