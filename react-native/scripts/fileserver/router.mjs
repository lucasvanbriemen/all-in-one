import {sendError} from './http.mjs';

/**
 * The dispatch half of the server: a route table goes in, a handler `http` can
 * be handed comes out.
 *
 * Matching is on method and exact pathname. This server answers a fixed
 * handful of endpoints and has no use for patterns or parameters in the path —
 * everything that varies from one request to the next arrives in the query
 * string — so a table and an equality test are the whole of it.
 */
export function createRouter(routes) {
  return async function handle(request, response) {
    const {pathname, searchParams} = new URL(request.url, 'http://localhost');
    const route = routes.find(
      candidate => candidate.method === request.method && candidate.path === pathname,
    );

    if (!route) {
      sendError(response, 404, 'not found');
      return;
    }

    try {
      await route.handler({request, response, searchParams});
    } catch (error) {
      // A route that throws has already failed, and there is nothing to be
      // done about that here. What must not *also* happen is the connection
      // being left open for a reply that is never coming.
      console.error(`Unhandled error in ${route.method} ${route.path}; error: ${error}`);

      if (!response.headersSent) {
        sendError(response, 500, 'internal error');
      } else if (!response.writableEnded) {
        response.end();
      }
    }
  };
}
