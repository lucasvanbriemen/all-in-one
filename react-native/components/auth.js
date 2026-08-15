import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The session: one token, good for a week.
 *
 * A password is never typed into this app. The login screen is the real
 * login.ltvb.nl page, and it hands the token back the same way it does for the
 * web apps — by redirecting to `?auth_token=…`. From there the token is stored
 * and replayed as a bearer token on every request until it expires, which is
 * what makes this "log in once a week" rather than "log in on every launch".
 *
 * There is no refresh: the expiry is fixed at login, so the week always ends a
 * week after the *login*, not after the last request.
 */
export const LOGIN_URL = 'https://login.ltvb.nl';

/**
 * Where the login app is told to send the browser once the form is submitted.
 * Nothing is ever loaded from it — the login screen cancels that navigation and
 * keeps the token — so it only has to be a URL this app can recognise.
 */
export const CALLBACK_URL = 'https://aio.ltvb.nl/auth/callback';

// Mirrors Token::TOKEN_DURATION in the login app, same as AUTH_COOKIE_DURATION
// does on the Rails side. Only the redirect comes back, not the expiry, so this
// is a local hint that saves a doomed request: the server is still the one that
// decides, and a 401 signs us out whatever this says.
const TOKEN_DURATION = 7 * 24 * 60 * 60 * 1000;

const STORAGE_KEY = 'auth.session';

/**
 * Pulls the token the login app appended to a URL, or `null` if it isn't there.
 * Read with a regex rather than `URL`: React Native ships a partial `URL`
 * without `searchParams`.
 */
export function tokenFromUrl(url) {
  const token = url?.match(/[?&]auth_token=([^&#]+)/)?.[1];

  return token ? decodeURIComponent(token) : null;
}

/**
 * The same, but only for the redirect this app asked for — everything else the
 * login page navigates to has to be left alone.
 */
export function tokenFromCallback(url) {
  return url?.startsWith(CALLBACK_URL) ? tokenFromUrl(url) : null;
}

/**
 * Trades a token for the account behind it, which doubles as checking that the
 * token is real before it is stored.
 */
async function fetchAccount(token) {
  const response = await fetch(`${LOGIN_URL}/session/${encodeURIComponent(token)}`, {
    headers: {Accept: 'application/json'},
  });

  if (!response.ok) {
    throw new Error(`Session lookup failed with ${response.status}`);
  }

  const account = await response.json();

  // The same trap the Rails side has to sidestep: the login app answers 200 for
  // every token and marks an unknown or expired one `isloggedin: false`.
  if (!account.isloggedin) {
    throw new Error('That login did not take');
  }

  return account;
}

/** `{token, expiresAt, account}` once signed in, `null` when signed out. */
let session = null;

const listeners = new Set();

function publish() {
  listeners.forEach(listener => listener(session));
}

async function store(next) {
  session = next;

  if (next) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } else {
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  publish();
}

export const auth = {
  /** Read by `api.js` on every request, so it must stay synchronous. */
  get token() {
    return session?.token ?? null;
  },

  get account() {
    return session?.account ?? null;
  },

  /**
   * Every change to the session is published, whoever caused it — signing in,
   * signing out, or `api.js` reacting to a 401. One subscriber (App) is enough
   * to keep the whole tree in step.
   */
  subscribe(listener) {
    listeners.add(listener);

    return () => listeners.delete(listener);
  },

  /**
   * Loads the stored session at launch. Resolves to `null` when there is
   * nothing to restore, which is the signal to show the login screen.
   */
  async restore() {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const restored = stored ? JSON.parse(stored) : null;

    // The expiry is known up front and never moves, so a token that is past it
    // can be dropped here rather than spending a round trip to be refused.
    if (!restored || Date.parse(restored.expiresAt) <= Date.now()) {
      await store(null);
      return null;
    }

    session = restored;
    publish();

    return session;
  },

  /** Takes the token the login page redirected back with and opens a session. */
  async signInWithToken(token) {
    const account = await fetchAccount(token);

    await store({
      token,
      expiresAt: new Date(Date.now() + TOKEN_DURATION).toISOString(),
      account,
    });

    return session;
  },

  // Local only. The login app routes `DELETE /session` but has never
  // implemented the action, so there is nothing to revoke against: the token
  // stays valid for the rest of its week, it just isn't on this device any more.
  async signOut() {
    await store(null);
  },
};
