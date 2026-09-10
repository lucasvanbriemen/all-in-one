export function createRouter(routes) {
  return async function handle(request, response) {
    const {pathname, searchParams} = new URL(request.url, 'http://localhost');
    const route = routes.find(
      candidate => candidate.method === request.method && candidate.path === pathname,
    );

    await route.handler({request, response, searchParams});
  };
}
