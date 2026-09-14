import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

import {api} from './api';

export const push = {
  async requestPermission() {
    return NativeModules.PushNotifications.requestPermission();
  },

  subscribe() {
    const emitter = new NativeEventEmitter(NativeModules.PushNotifications);
    const tokenSub = emitter.addListener('pushToken', ({token}) => {
      api.post('/device_tokens', {token, platform: Platform.OS})
    });

    return () => {
      tokenSub.remove();
    };
  },
};
