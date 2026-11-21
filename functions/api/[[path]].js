// Cloudflare Pages: every /api/... request goes to the live backend (see functions/_proxy.js).
import { forward } from "../_proxy.js";

export const onRequest = ({ request, env }) => forward(request, env.API_URL || undefined);
