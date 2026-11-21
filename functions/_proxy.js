// Cloudflare Pages only (Netlify ignores this folder and uses netlify.toml instead).
// Cloudflare Pages cannot forward /api/* to another server with a _redirects rule, so this function
// does it: the browser only talks to the site's own address, and the API needs no CORS settings.
// Set API_URL in the Pages project's settings to use a different backend.
export const LIVE_API = "https://celebrate-api.thewtontech.com";

export async function forward(request, apiUrl = LIVE_API) {
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, apiUrl);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", url.protocol.replace(":", ""));
  const hasBody = !["GET", "HEAD"].includes(request.method);
  try {
    const answer = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
    });
    return new Response(answer.body, { status: answer.status, statusText: answer.statusText, headers: answer.headers });
  } catch {
    return Response.json({ error: "We could not reach the server. Please try again." }, { status: 502 });
  }
}
