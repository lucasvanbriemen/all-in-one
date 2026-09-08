/**
 * Every reply this server sends is JSON, including its failures: the editor's
 * client reads `error` off the body whenever a request did not succeed.
 */
export function sendJson(response, status, payload) {
  response.writeHead(status, {'Content-Type': 'application/json'});
  response.end(JSON.stringify(payload));
}

export function sendError(response, status, message) {
  sendJson(response, status, {error: message});
}

/**
 * `http` delivers a body as a stream of chunks, and every route that takes one
 * wants the whole of it before it can do anything, so each of them would
 * otherwise open the same collector by hand.
 */
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
