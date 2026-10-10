import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

import {api} from './api';

export const push = {
  async requestPermission() {
    return NativeModules.PushNotifications.requestPermission();
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
