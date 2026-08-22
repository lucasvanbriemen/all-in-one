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
