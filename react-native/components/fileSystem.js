import secrets from './secerts.json';

export const BASE_URL = 'http://127.0.0.1:4001';

/**
 * Anything the server refused, with the status and the message it gave. The
 * page shows the message in a toast, and checks `status` for the cases it
 * handles itself — 409 on a write is "the file changed under you".
 */
export class FileSystemError extends Error {
  constructor(status, message, url) {
    super(message);
    this.status = status;
    this.url = url;
  }
}

/** The server is not answering at all — as opposed to answering "no". */
export class ServerUnavailableError extends Error {
  constructor(cause) {
    super('The file server is not running');
    this.cause = cause;
  }
}

function query(parameters) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  }

  const text = search.toString();
  return text ? `?${text}` : '';
}

export const fileSystem = {
  get defaultHeaders() {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${secrets.API_KEY}`,
    };
  },

  async request(method, route, parameters = {}, body) {
    const url = `${BASE_URL}${route}${query(parameters)}`;
    let response;

    try {
      response = await fetch(url, {
        method,
        headers: this.defaultHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new ServerUnavailableError(error);
    }

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message = (isJson && data?.error) || `${method} ${route} failed with ${response.status}`;
      throw new FileSystemError(response.status, message, url);
    }

    return data;
  },

  health() {
    return this.request('GET', '/health');
  },

  listFiles(projectRoot, path) {
    return this.request('GET', '/files', {projectRoot, path});
  },

  readFile(projectRoot, path) {
    return this.request('GET', '/file', {projectRoot, path});
  },

  stat(projectRoot, path) {
    return this.request('GET', '/stat', {projectRoot, path});
  },

  /** `expectedMtime` makes the write conditional: a 409 means the disk moved on. */
  writeFile(projectRoot, path, contents, expectedMtime) {
    return this.request('PUT', '/file', {projectRoot, path}, {contents, expectedMtime});
  },

  createFile(projectRoot, path, contents = '') {
    return this.request('POST', '/file', {projectRoot, path}, {contents});
  },

  createDirectory(projectRoot, path) {
    return this.request('POST', '/directory', {projectRoot, path});
  },

  deletePath(projectRoot, path) {
    return this.request('DELETE', '/file', {projectRoot, path});
  },

  rename(projectRoot, from, to) {
    return this.request('POST', '/rename', {projectRoot, from, to});
  },

  searchFiles(projectRoot, term, type = 'files', options = {}) {
    return this.request('GET', '/search', {
      projectRoot,
      term,
      type,
      caseSensitive: options.caseSensitive ? 'true' : undefined,
      regex: options.regex ? 'true' : undefined,
      wholeWord: options.wholeWord ? 'true' : undefined,
    });
  },

  replace(projectRoot, term, replacement, options = {}) {
    return this.request('POST', '/replace', {projectRoot}, {term, replacement, ...options});
  },

  getState() {
    return this.request('GET', '/state');
  },

  patchState(patch) {
    return this.request('PATCH', '/state', {}, patch);
  },

  git: {
    status: projectRoot => fileSystem.request('GET', '/git/status', {projectRoot}),
    show: (projectRoot, path, ref) => fileSystem.request('GET', '/git/show', {projectRoot, path, ref}),
    diff: (projectRoot, path, staged) => fileSystem.request('GET', '/git/diff', {projectRoot, path, staged: staged ? 'true' : undefined}),
    log: (projectRoot, limit) => fileSystem.request('GET', '/git/log', {projectRoot, limit}),
    branches: projectRoot => fileSystem.request('GET', '/git/branches', {projectRoot}),
    stage: (projectRoot, paths) => fileSystem.request('POST', '/git/stage', {projectRoot}, paths === 'all' ? {all: true} : {paths}),
    unstage: (projectRoot, paths) => fileSystem.request('POST', '/git/unstage', {projectRoot}, paths === 'all' ? {all: true} : {paths}),
    discard: (projectRoot, paths) => fileSystem.request('POST', '/git/discard', {projectRoot}, {paths}),
    commit: (projectRoot, message, amend = false) => fileSystem.request('POST', '/git/commit', {projectRoot}, {message, amend}),
    checkout: (projectRoot, branch, create = false) => fileSystem.request('POST', '/git/checkout', {projectRoot}, {branch, create}),
  },

  /**
   * The terminal panel's socket. Built here so the host lives in one place,
   * even though nothing about it is a request: the shell is spawned at the size
   * the emulator measured, in the project the editor has open.
   */
  terminalUrl(projectRoot, size = null) {
    return socketUrl('/terminal', {
      cwd: projectRoot,
      cols: size?.cols,
      rows: size?.rows,
    });
  },

  eventsUrl(projectRoot) {
    return socketUrl('/events', {projectRoot});
  },

  lspUrl(projectRoot, language) {
    return socketUrl('/lsp', {projectRoot, language});
  },

  /** Where the WebViews load their libraries from when the server is up. */
  vendorUrl(packageName, rest = '') {
    return `${BASE_URL}/vendor/${packageName}${rest ? `/${rest}` : ''}`;
  },

  importMap() {
    return this.request('GET', '/import-map');
  },
};

function socketUrl(route, parameters) {
  return `${BASE_URL.replace(/^http/, 'ws')}${route}${query(parameters)}`;
}
