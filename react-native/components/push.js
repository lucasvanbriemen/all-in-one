import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

import {api} from './api';

// Navigates to what a notification's source points at: "email.<mailbox>.<id>"
// or "messages.whatsapp.<jid>". Only the first two dots separate parts, since
// JIDs contain dots themselves (31612345678@s.whatsapp.net).
export function openSource(set, source) {
  const [kind, section, ...rest] = String(source || '').split('.');
  const id = rest.join('.');

  set('app.activeApp', kind);
  set('app.activeSidebarItem', section);
  if (kind === 'email') set('email.selectedEmailId', Number(id));
  if (kind === 'messages') set('whatsapp.activeJid', id);
}

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
