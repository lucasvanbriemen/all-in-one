import {NativeModules} from 'react-native';

export const mediaPicker = {
  // Resolves to {uri, name, type, size, width, height, kind}, or null when
  // cancelled. The file is already converted to something WhatsApp accepts.
  pick() {
    return NativeModules.MediaPicker.pick();
  },
};
