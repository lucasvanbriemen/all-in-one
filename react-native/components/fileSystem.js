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
  listFiles(path) {
    return this.makeRequest("/files", path);
  },

  readFile(path) {
    return this.makeRequest("/file", path);
  },

  writeFile(path, contents) {
    const fullUrl = `/file?path=${encodeURIComponent(path)}`;

    return this.sendRequest("PUT", fullUrl, { contents });
  },

  /** The folder every other path in this module is relative to. */
  getRoot() {
    return this.makeRequest("/root");
  },

  /** Points the file server at `root`, an absolute path on this machine. */
  setRoot(root) {
    return this.sendRequest("PUT", "/root", { root });
  },

  makeRequest(url, path = null, headers = {}) {
    const fullUrl = path ? `${url}?path=${encodeURIComponent(path)}` : url;

    return this.sendRequest("GET", fullUrl, null, headers);
  },

  sendRequest(method, fullUrl, body = null, headers = {}) {
    const options = {
      method,
      headers: {
        ...this.defaultHeaders,
        ...headers,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    // React Native has no page to resolve relative URLs against, so every
    // request is prefixed with the API host.
    return fetch(BASE_URL + fullUrl, options)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`${method} ${fullUrl} failed with ${response.status}`);
        }
        if (response.headers.get("content-type")?.includes("application/json")) { return response.json(); }
        return response.text();
      });
  },
};
