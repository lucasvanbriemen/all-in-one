const URL = process.env.EVENTS_URL; 
const SECRET = process.env.EVENTS_SECRET;
const FLUSH_EVERY_MS = 2000;
const MAX_QUEUED = 5000;

let queue = [];
let sending = false;

export function recordEvent(device, attribute, value, { snapshot = false } = {}) {
  if (!URL || !SECRET) return;

  queue.push({
    device_id: device.id,
    device_type: device.type,
    attribute,
    value,
    snapshot,
    at: new Date().toISOString(),
  });
  if (queue.length > MAX_QUEUED) queue = queue.slice(-MAX_QUEUED);
}

// Records every value a device has right now, so the timeline has a known starting point after a restart.
export function recordSnapshot(device) {
  for (const [attribute, value] of Object.entries(device.state)) {
    recordEvent(device, attribute, value, { snapshot: true });
  }
}

async function flush() {
  if (sending || queue.length === 0) return;

  sending = true;
  const batch = queue;
  queue = [];
  await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Bridge-Secret": SECRET },
    body: JSON.stringify({ events: batch }),
    signal: AbortSignal.timeout(10_000),
  });
  sending = false;
}

setInterval(flush, FLUSH_EVERY_MS).unref();
