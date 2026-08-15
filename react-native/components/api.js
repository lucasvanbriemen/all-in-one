import { auth } from "./auth";

const BASE_URL = "https://aio.ltvb.nl";

/** Thrown on a 401 so callers can tell "logged out" from "the request failed". */
export class AuthError extends Error {}

export const api = {
  // A getter so every request reads the *current* token: it is absent until the
  // stored session is restored, and gone again the moment the session ends.
  get defaultHeaders() {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (auth.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }

    return headers;
  },

  get(url, headers = {}) {
    return this.makeRequest("GET", url, null, headers);
  },

  patch(url, data, headers = {}) {
    return this.makeRequest("PATCH", url, data, headers);
  },

  post(url, data, headers = {}) {
    return this.makeRequest("POST", url, data, headers);
  },

  put(url, data, headers = {}) {
    return this.makeRequest("PUT", url, data, headers);
  },

  makeRequest(method, url, data = null, headers = {}) {
    const options = {
      method,
      headers: {
        ...this.defaultHeaders,
        ...headers,
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    // React Native has no page to resolve relative URLs against, so every
    // request is prefixed with the API host.
    return fetch(BASE_URL + url, options)
      .then(async (response) => {
        // The week is up, or the token was revoked. Ending the session here
        // means one 401 returns the whole app to the login screen, instead of
        // every panel failing separately with nothing to act on.
        if (response.status === 401) {
          auth.signOut();
          throw new AuthError(`${method} ${url} needs a login`);
        }

        if (!response.ok) {
          throw new Error(`${method} ${url} failed with ${response.status}`);
        }
        if (response.headers.get("content-type")?.includes("application/json")) { return response.json(); }
        return response.text();
      });
  },
};
