import http from "node:http";
import { onOff, level, color } from "./lamp.js"

const PORT = 4003;

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

async function statusData(res) {
  const isTurnedOn = await onOff.getOnOffAttribute();
  const brightness = await level.getCurrentLevelAttribute();

  const currentColor = await color.getEnhancedCurrentHueAttribute();
  const howCloseToWhite = await color.getCurrentSaturationAttribute();
  jsonResponse(res, 200, { status: "ok", isTurnedOn, brightness, currentColor, howCloseToWhite });
}

async function changeData(req, res) {
  jsonResponse(res, 200, { status: "ok" });
}