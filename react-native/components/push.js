import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

import {api} from './api';

export const push = {
  async requestPermission() {
    return NativeModules.PushNotifications.requestPermission();
  },

  subscribe() {
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

    return () => {
      tokenSub.remove();
    };
  },
};
