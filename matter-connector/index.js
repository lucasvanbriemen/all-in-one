import http from "node:http";
import { onOff, level, color, EVEN_IF_OFF, disconnect } from "./lamp.js"
import { colorUtils } from "./colors.js"

const PORT = 4003;

let pendingChanges = null;
let isBusy = false;
const MAX_PENDING_CHANGES = 10;

const ROUTES = [
  {
    path: "/",
    method: "GET",
    handler: (req, res) => {
      mainData(res);
    }
  },
  {
    path: "/status",
    method: "GET",
    handler: (req, res) => {
      statusData(res);
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


function mainData(res) {
  jsonResponse(res, 200, { hello: "lamp!" });
}

function notFound(res) {
  jsonResponse(res, 404, { error: "Not Found" });
}

function addPendingChanges(incomingChange) {
  pendingChanges = { ...pendingChanges, ...incomingChange };

  // Limit the number of pending changes to avoid memory issues
  if (Object.keys(pendingChanges).length > MAX_PENDING_CHANGES) {
    pendingChanges = Object.fromEntries(Object.entries(pendingChanges).slice(-MAX_PENDING_CHANGES));
  }

  if (!isBusy) {
    applyPending();
  }
}

async function statusData(res) {
  const isTurnedOn = await onOff.getOnOffAttribute();
  const brightness = await level.getCurrentLevelAttribute();

  let currentColor = await color.getEnhancedCurrentHueAttribute();
  currentColor = currentColor / 65535 * 360;  // Convert from 0-65535 to 0-360 degrees

  const howCloseToWhite = await color.getCurrentSaturationAttribute();

  const currentHex = colorUtils.hueAndSaturationToHex(currentColor, howCloseToWhite);

  jsonResponse(res, 200, { status: "ok", isTurnedOn, brightness, currentHex });
}

async function changeData(req, res) {
  const body = [];
  for await (const chunk of req) {
    body.push(chunk);
  }

  let data = JSON.parse(Buffer.concat(body).toString());

  addPendingChanges({ brightness: data.brightness, hex: data.hex });
  jsonResponse(res, 202, { status: "queued" });
}

async function applyPending() {
  isBusy = true;
  while (pendingChanges) {
    const change = pendingChanges;
    pendingChanges = null;
    await applyChange(change);
  }
  isBusy = false;
}

async function applyChange(change) { 
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