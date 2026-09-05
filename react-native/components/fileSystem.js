import secrets from './secerts.json';

const BASE_URL = "http://127.0.0.1:4001";

export const fileSystem = {
  get defaultHeaders() {
    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${secrets.API_KEY}`,
    };
  },
  listFiles(projectRoot, path) {
    return this.makeRequest(projectRoot, "/files", path);
  },

  readFile(projectRoot, path) {
    return this.makeRequest(projectRoot, "/file", path);
  },

  searchFiles(projectRoot, searchTerm, type = 'files') {
    const fullUrl = `/search?projectRoot=${encodeURIComponent(projectRoot)}&term=${encodeURIComponent(searchTerm)}&type=${encodeURIComponent(type)}`;
    return fetch(BASE_URL + fullUrl, {
      method: "GET",
      headers: { ...this.defaultHeaders },
    }).then(async (response) => {
      const isJson = response.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await response.json() : await response.text();
      return data;
    });
  },

  /**
   * The terminal panel's socket. Built here so the host lives in one place,
   * even though nothing about it is a request: the shell is spawned at the size
   * the emulator measured, in the project the editor has open.
   */
  terminalUrl(projectRoot, size = null) {
    const parameters = [];

    if (projectRoot) {
      parameters.push(`cwd=${encodeURIComponent(projectRoot)}`);
    }

    if (size) {
      parameters.push(`cols=${size.cols}`, `rows=${size.rows}`);
    }

    return `${BASE_URL.replace(/^http/, "ws")}/terminal?${parameters.join("&")}`;
  },

  writeFile(projectRoot, path, contents) {
    const fullUrl = `/file?path=${encodeURIComponent(path)}&projectRoot=${encodeURIComponent(projectRoot)}`;
    const options = {
      method: "PUT",
      headers: {
        ...this.defaultHeaders,
      },
      body: JSON.stringify({ contents }),
    };
    return fetch(BASE_URL + fullUrl, options)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`PUT ${fullUrl} failed with ${response.status}`);
        }
        if (response.headers.get("content-type")?.includes("application/json")) { return response.json(); }
        return response.text();
      });
  },

  makeRequest(projectRoot, url, path = null, headers = {}) {
    const fullUrl = path ? `${url}?path=${encodeURIComponent(path)}&projectRoot=${encodeURIComponent(projectRoot)}` : `${url}?projectRoot=${encodeURIComponent(projectRoot)}`;
    const options = {
      method: "GET",
      headers: {
        ...this.defaultHeaders,
        ...headers,
      },
    };

    // React Native has no page to resolve relative URLs against, so every
    // request is prefixed with the API host.
    return fetch(BASE_URL + fullUrl, options)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`GET ${fullUrl} failed with ${response.status}`);
        }
        if (response.headers.get("content-type")?.includes("application/json")) { return response.json(); }
        return response.text();
      });
  },
};
