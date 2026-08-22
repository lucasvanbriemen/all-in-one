import {NativeModules} from 'react-native';

/**
 * The native macOS folder chooser, backed by NSOpenPanel.
 *
 */
export const folderPicker = {
  pick() {
    if (!this.isAvailable) {
      return Promise.resolve(null);
    }

    return NativeModules.FolderPicker.pick();
  },
};
