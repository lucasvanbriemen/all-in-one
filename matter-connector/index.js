import http from "node:http";

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

function mainData(res) {
  jsonResponse(res, 200, { message: "Hello, World!" });
}

function notFound(res) {
  jsonResponse(res, 404, { error: "Not Found" });
}
