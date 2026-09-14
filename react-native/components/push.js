import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

import {api} from './api';

// Registers this device for APNs pushes and keeps the Rails API informed of
// its token. Native-only: on web the module is absent and every call is a
// no-op.
const native = NativeModules.PushNotifications;

export const push = {
  available: Boolean(native),

  // Prompts on first run, silently re-registers afterwards. Resolves with the
  // authorization status; the token arrives through subscribe().
  async requestPermission() {
    if (!native) return 'unavailable';
    return native.requestPermission();
  },

  // Listens for the token (also delivered retroactively if it arrived before
  // JS mounted), posts it to the API, and reports taps on notifications.
  subscribe({onOpened} = {}) {
    if (!native) return () => {};

    const emitter = new NativeEventEmitter(native);
    const tokenSub = emitter.addListener('pushToken', ({token}) => {
      api.post('/device_tokens', {token, platform: Platform.OS})
    });
    const openedSub = emitter.addListener('pushOpened', payload => {
      onOpened?.(payload);
    });

    return () => {
      tokenSub.remove();
      openedSub.remove();
    };
  },
};
