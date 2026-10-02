/**
 * Web stand-in for the native push bridge. APNs tokens only exist on Apple
 * platforms, so there is nothing to register here; the API is kept so
 * `App.jsx` can call it unconditionally.
 */
export const push = {
  async requestPermission() {
    return false;
  },

  subscribe() {
    return () => {};
  },
};
