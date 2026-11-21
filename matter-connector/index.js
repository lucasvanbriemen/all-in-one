import http from "node:http";
import { lamps, EVEN_IF_OFF, disconnect } from "./lamp.js"
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
      jsonResponse(res, 200, { lamps: Object.keys(lamps) });
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

async function lampStatus(lamp) {
  const isTurnedOn = await lamp.onOff.getOnOffAttribute();
  const brightness = await lamp.level.getCurrentLevelAttribute();

  let currentColor = await lamp.color.getEnhancedCurrentHueAttribute();
  currentColor = currentColor / 65535 * 360;  // Convert from 0-65535 to 0-360 degrees

  const howCloseToWhite = await lamp.color.getCurrentSaturationAttribute();

  const currentHex = colorUtils.hueAndSaturationToHex(currentColor, howCloseToWhite);

  return { id: lamp.id, isTurnedOn, brightness, currentHex };
}

// GET /status?id=<lampId> returns one lamp, GET /status returns all of them.
async function statusData(req, res) {
  const id = new URL(req.url, "http://localhost").searchParams.get("id");

  if (id) {
    if (!lamps[id]) return jsonResponse(res, 404, { error: `Unknown lamp ${id}` });
    return jsonResponse(res, 200, { status: "ok", ...(await lampStatus(lamps[id])) });
  }

  const all = await Promise.all(Object.values(lamps).map(lampStatus));
  jsonResponse(res, 200, { status: "ok", lamps: all });
}

async function changeData(req, res) {
  const body = [];
  for await (const chunk of req) {
    body.push(chunk);
  }

  let data = JSON.parse(Buffer.concat(body).toString());

  // Send { id } to target one lamp; leave it out to change all lamps at once.
  if (data.id && !lamps[data.id]) {
    return jsonResponse(res, 404, { error: `Unknown lamp ${data.id}` });
  }
  const targetIds = data.id ? [data.id] : Object.keys(lamps);

  for (const lampId of targetIds) {
    addPendingChanges(lampId, { brightness: data.brightness, hex: data.hex });
  }
  jsonResponse(res, 202, { status: "queued", lamps: targetIds });
}

async function applyPending(lampId) {
  const queue = queues[lampId];
  queue.isBusy = true;
  try {
    while (queue.pendingChanges) {
      const change = queue.pendingChanges;
      queue.pendingChanges = null;
      await applyChange(lamps[lampId], change);
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