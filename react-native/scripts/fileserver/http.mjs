export function sendJson(response, payload, status = 200) {
  response.writeHead(status, {'Content-Type': 'application/json'});
  response.end(JSON.stringify(payload));
}

export function sendError(response, status, message) {
  sendJson(response, {error: message}, status);
}

/**
 * A request the handler could not honour, carrying the status it should be
 * answered with. Anything else that is thrown is a 500.
 */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
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

export async function readJson(request) {
  const body = await readBody(request);

  if (!body) {
    return {};
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    throw new HttpError(400, `Body is not JSON: ${error.message}`);
  }
}
