// Runs the Express API as a Netlify Function, so the site and its API deploy together.
import serverless from "serverless-http";
import { connectLambda, getStore } from "@netlify/blobs";
import app from "../../server/app.js";
import { setBackend } from "../../server/store.js";

const run = serverless(app);

// A function's memory does not last between requests, so bookings and pledges go in Netlify Blobs.
setBackend({
  read: (key) => getStore("celebrate").get(key, { type: "json" }),
  write: (key, value) => getStore("celebrate").setJSON(key, value),
});

export const handler = (event, context) => {
  try {
    connectLambda(event);
  } catch {
    // Without Blobs the store falls back to memory.
  }
  // Requests arrive as /api/... through the redirect in netlify.toml; direct calls use the function's own path.
  event.path = event.path.replace(/^\/\.netlify\/functions\/api/, "/api");
  return run(event, context);
};
