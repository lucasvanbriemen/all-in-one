import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

import {api} from './api';

// Shared with the web build (push.web.js), which has no native bridge.
export {openSource} from './openSource';

export const push = {
  async requestPermission() {
    return NativeModules.PushNotifications.requestPermission();
  },

  // Removes this source's notifications from Notification Center. Not
  // available on web.
  clearDelivered(source) {
    NativeModules.PushNotifications?.clearDelivered?.(source);
  },

  // `onOpen` receives the tapped notification's payload ({notification_id,
  // source}), including a tap that launched the app from cold.
  subscribe(onOpen) {
    const emitter = new NativeEventEmitter(NativeModules.PushNotifications);
    const {bundleIdentifier, apsEnvironment} = NativeModules.PushNotifications.getConstants();
    const tokenSub = emitter.addListener('pushToken', ({token}) => {
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
};
