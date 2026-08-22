import {NativeModules} from 'react-native';

/**
 * The native macOS folder chooser, backed by NSOpenPanel.
 *
 * Only the macOS build has one — `NativeModules.FolderPicker` is undefined
 * under vite — so the web build gets `isAvailable: false` and hides the
 * control rather than crashing on a missing module.
 */
export const folderPicker = {
  get isAvailable() {
    return Boolean(NativeModules.FolderPicker);
  },

  /** The chosen absolute path, or null when the panel was cancelled. */
  pick() {
    if (!this.isAvailable) {
      return Promise.resolve(null);
    }

    return NativeModules.FolderPicker.pick();
  },
};
