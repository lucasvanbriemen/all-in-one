import {NativeModules} from 'react-native';
import secrets from './secerts.json';

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
};
