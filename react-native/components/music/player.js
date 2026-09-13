import {NativeEventEmitter, NativeModules} from 'react-native';

import secrets from '../secerts.json';

const BASE_URL = "https://aio.ltvb.nl/get-mp3/";

export const player = {
  async play(song, set) {
    await NativeModules.AudioPlayer.play(BASE_URL + song.isrc, {
      title: song.title,
      artist: song.artist,
      album: song.album,
      artwork: song.image_url,
    }, { Authorization: `Bearer ${secrets.API_KEY}` });

    set('music.now-playing', song);
  },

  async pause() {
    await NativeModules.AudioPlayer.pause();
  },

  async resume() {
    await NativeModules.AudioPlayer.resume();
  },

  subscribe(set) {
    const emitter = new NativeEventEmitter(NativeModules.AudioPlayer);
    const sub = emitter.addListener('playbackStateChanged', ({isPlaying}) => {
      set('music.now-playing.is-playing', isPlaying);
    });
    return () => sub.remove();
  },
};
