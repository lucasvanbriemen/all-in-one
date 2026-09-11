import {NativeModules} from 'react-native';

// Thin wrapper around the native AudioPlayer module (native/AudioPlayer).
// Same interface as player.web.js so the context doesn't care which one it got.
//
// Everything is resolved lazily: if the running binary predates the module
// (Metro reloads JS but not native code), importing this file must not crash
// the whole app — only the play button should fail, with a readable message.

function native() {
  const mod = NativeModules.AudioPlayer;
  return mod;
}

export const player = {
  play: (url, metadata = {}, headers = {}) => native().play(url, metadata, headers),
  resume: () => native().resume(),
  stop: () => native().stop(),
  seek: seconds => native().seek(seconds),
  updateMetadata: metadata => native().updateMetadata(metadata),
};
