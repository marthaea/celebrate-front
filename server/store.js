// Where bookings and pledges are kept. By default that is this process's memory, which is lost
// on restart. A host can plug in something lasting with setBackend (see netlify/functions/api.js).
// Swap this for a database when the real backend arrives.
const memory = new Map();
let backend = null;

export function setBackend(next) {
  backend = next;
}

export async function read(key, fallback) {
  if (backend) {
    try {
      const value = await backend.read(key);
      if (value != null) return value;
    } catch {
      // Fall back to memory so the site keeps working if the lasting store is unreachable.
    }
  }
  return memory.has(key) ? memory.get(key) : fallback;
}

export async function write(key, value) {
  memory.set(key, value);
  if (backend) {
    try {
      await backend.write(key, value);
    } catch {
      // Kept in memory only.
    }
  }
}
