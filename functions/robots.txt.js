// Cloudflare Pages: /robots.txt with this site's own domain (see site/src/sitemapRoute.js).
import { sitemapOrRobots } from "../site/src/sitemapRoute.js";

export const onRequest = ({ request, env }) => sitemapOrRobots(request, env.SITE_URL);
