import http from "node:http";

const PORT = 4003;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });

  const path = new URL(req.url, "http://localhost").pathname;
  if (path === "/") {
    res.end("Hello, World!\n");
  } else {
    res.end("Not Found\n");
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
