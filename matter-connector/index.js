import http from "node:http";
import { devices, EVEN_IF_OFF, disconnect, pair } from "./devices.js"
import { colorUtils } from "./colors.js"

const PORT = 4003;

// Each lamp gets its own queue, so a slow lamp doesn't hold up the others.
// queues[lampId] = { pendingChanges, isBusy }
const queues = {};
const MAX_PENDING_CHANGES = 10;

const ROUTES = [
  {
    path: "/",
    method: "GET",
    handler: (req, res) => {
      jsonResponse(res, 200, { devices: Object.keys(devices) });
    }
  },
  {
    path: "/status",
    method: "GET",
    handler: (req, res) => {
      statusData(req, res);
    }
  },
  {
    path: "/change",
    method: "POST",
    handler: (req, res) => {
      changeData(req, res);
    }
  },
  {
    path: "/pair",
    method: "GET",
    handler: (req, res) => {
      pairData(req, res);
    }
  },
  {
    path: "*",
    method: "GET",
    handler: (req, res) => {
      notFound(res);
    }
  }
]

function jsonResponse(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;

  const route = ROUTES.find(r => r.path === path || r.path === "*");
  if (route && route.method === req.method) {
    route.handler(req, res);
  } else {
    notFound(res);
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});

process.on("SIGINT", async () => {
  await disconnect();
  process.exit(0);
});


function notFound(res) {
  jsonResponse(res, 404, { error: "Not Found" });
}

function addPendingChanges(lampId, incomingChange) {
  const queue = queues[lampId] ??= { pendingChanges: null, isBusy: false };
  queue.pendingChanges = { ...queue.pendingChanges, ...incomingChange };

  // Limit the number of pending changes to avoid memory issues
  if (Object.keys(queue.pendingChanges).length > MAX_PENDING_CHANGES) {
    queue.pendingChanges = Object.fromEntries(Object.entries(queue.pendingChanges).slice(-MAX_PENDING_CHANGES));
  }

  if (!queue.isBusy) {
    applyPending(lampId);
  }
}

function statusData(req, res) {
  const id = new URL(req.url, "http://localhost").searchParams.get("id");

  if (id) {
    if (!devices[id]) return jsonResponse(res, 404, { error: `Unknown lamp ${id}` });
    return jsonResponse(res, 200, { status: "ok", ...devices[id].toJSON() });
  }

  jsonResponse(res, 200, { status: "ok", devices: Object.values(devices) });
}

// GET /pair?code=<manual pairing code>. Takes 10-60s while the device is commissioned.
async function pairData(req, res) {
  const code = new URL(req.url, "http://localhost").searchParams.get("code");
  if (!code) return jsonResponse(res, 400, { error: "Missing ?code=" });

  try {
    const result = await pair(code);
    jsonResponse(res, 200, { status: "paired", ...result });
  } catch (error) {
    console.error("Pairing failed:", error.message);
    jsonResponse(res, 500, { error: `Pairing failed: ${error.message}` });
  }
}

async function changeData(req, res) {
  const body = [];
  for await (const chunk of req) {
    body.push(chunk);
  }

  let data = JSON.parse(Buffer.concat(body).toString());

  // Send { id } to target one lamp; leave it out to change all devices at once.
  if (data.id && !devices[data.id]) {
    return jsonResponse(res, 404, { error: `Unknown lamp ${data.id}` });
  }
  const targetIds = data.id ? [data.id] : Object.keys(devices);

  for (const lampId of targetIds) {
    addPendingChanges(lampId, { brightness: data.brightness, hex: data.hex });
  }
  jsonResponse(res, 202, { status: "queued", devices: targetIds });
}

async function applyPending(lampId) {
  const queue = queues[lampId];
  queue.isBusy = true;
  try {
    while (queue.pendingChanges) {
      const change = queue.pendingChanges;
      queue.pendingChanges = null;
      await applyChange(devices[lampId], change);
    }
  } catch (error) {
    console.error(`Failed to update lamp ${lampId}:`, error.message);
  } finally {
    queue.isBusy = false;
  }
}

async function applyChange(lamp, change) {
  const { onOff, level, color } = lamp;
  const isTurnedOn = await onOff.getOnOffAttribute();

  let brightness = change.brightness;
  let hex = change.hex;

  let { hue, saturation } = colorUtils.hexToHueAndSaturation(hex);

  // If a lamp is off with a diffrent color saved, it starts from there and tradulay transitions to the new color when turning on
  // This leads to weird color transition, so we set it to the wanted color immediately when turning on, so transition feels smooth
  if (!isTurnedOn) {
    await color.enhancedMoveToHueAndSaturation({ enhancedHue: Math.round((hue / 360) * 65535), saturation: saturation, transitionTime: 0, ...EVEN_IF_OFF });
  }

  await color.enhancedMoveToHueAndSaturation({ enhancedHue: Math.round((hue / 360) * 65535), saturation: saturation, transitionTime: 5, ...EVEN_IF_OFF });
  await level.moveToLevelWithOnOff({ level: brightness, transitionTime: 5, ...EVEN_IF_OFF });
}