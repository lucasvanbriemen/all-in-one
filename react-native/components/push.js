import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

import {api} from './api';

// Shared with the web build (push.web.js), which has no native bridge.
export {openSource} from './openSource';

// The Mac reports itself active this often while someone is using it; the
// server treats a Mac as active for two minutes after its last beat (see
// DeviceToken::ACTIVE_WINDOW), so pushes go there instead of to the phone.
const HEARTBEAT_MS = 45 * 1000;
// No keyboard or mouse input for this long (or the screen locked) means
// nobody is at the computer.
const IDLE_AFTER_SECONDS = 120;

let currentToken = null;

export const push = {
  async requestPermission() {
    return NativeModules.PushNotifications.requestPermission();
  },

  // Removes this source's notifications from Notification Center. Not
  // available on web.
  clearDelivered(source) {
    NativeModules.PushNotifications?.clearDelivered?.(source);
  },

  // Drops delivered notifications that are no longer unread on the server,
  // however they got read (opened chat, home card, another device).
  async syncDelivered() {
    if (!NativeModules.PushNotifications?.retainDelivered) return;
    const stacks = await api.getOrThrow('/notifications/stacks?limit=200').catch(() => null);
    if (!Array.isArray(stacks)) return;
    NativeModules.PushNotifications.retainDelivered(stacks.map(stack => stack.source));
  },

  // `onOpen` receives the tapped notification's payload ({notification_id,
  // source}), including a tap that launched the app from cold.
  subscribe(onOpen) {
    const emitter = new NativeEventEmitter(NativeModules.PushNotifications);
    const {bundleIdentifier, apsEnvironment} = NativeModules.PushNotifications.getConstants();
    const tokenSub = emitter.addListener('pushToken', ({token}) => {
      currentToken = token;
      api.post('/device_tokens', {
        token,
        platform: Platform.OS,
        topic: bundleIdentifier,
        environment: apsEnvironment,
      });
    });
    const openSub = emitter.addListener('pushOpened', payload => onOpen?.(payload));

    return () => {
      tokenSub.remove();
      openSub.remove();
    };
  },

  // macOS only: tells the server this Mac is in use while there is recent
  // keyboard/mouse input, whether or not this app is in front.
  startPresence() {
    if (Platform.OS !== 'macos' || !NativeModules.PushNotifications?.idleSeconds) return () => {};

    const beat = async () => {
      if (!currentToken) return;
      const idle = await NativeModules.PushNotifications.idleSeconds().catch(() => null);
      if (idle == null || idle > IDLE_AFTER_SECONDS) return;
      api.post(`/device_tokens/${currentToken}/active`, {}).catch(() => {});
    };

    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(timer);
  },
};
