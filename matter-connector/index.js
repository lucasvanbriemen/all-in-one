import http from "node:http";

const PORT = 4003;

function jsonResponse(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const path = new URL(req.url, "http://localhost").pathname;

  if (path === "/") {
    jsonResponse(res, 200, { message: "Hello, World!" });
  } else {
    jsonResponse(res, 404, { error: "Not Found" });
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
