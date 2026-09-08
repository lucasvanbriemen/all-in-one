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

    await route.handler({request, response, searchParams});
  };
}
