export function sendJson(response, payload) {
  response.writeHead(200, {'Content-Type': 'application/json'});
  response.end(JSON.stringify(payload));
}

export function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';

    request.on('data', chunk => {
      body += chunk.toString();
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}
