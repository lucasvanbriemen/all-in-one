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

  async playPlaylist(songs, set, atIndex = 0) {
    const songToPlay = songs[atIndex];

    set('music.last-songs', songs.slice(0, atIndex));
    set('music.queue', songs.slice(atIndex + 1));
    await player.play(songToPlay, set);
  },

  async next(set, get) {
    const queue = get('music.queue') || [];
    if (queue.length === 0) return;

    const currentlyPlaying = get('music.now-playing');
    const lastSongs = get('music.last-songs') || [];
    if (currentlyPlaying) {
      set('music.last-songs', [...lastSongs, currentlyPlaying]);
    }

    set('music.queue', queue.slice(1));
    await player.play(queue[0], set);
  },

  async previous(set, get) {
    const queue = get('music.queue') || [];
    const lastSongs = get('music.last-songs') || [];
    if (lastSongs.length === 0) return;

    const currentlyPlaying = get('music.now-playing');
    const previousSong = lastSongs[lastSongs.length - 1];
    set('music.last-songs', lastSongs.slice(0, -1));
    set('music.queue', currentlyPlaying ? [currentlyPlaying, ...queue] : [...queue]);
    await player.play(previousSong, set);
  },

  async pause() {
    await NativeModules.AudioPlayer.pause();
  },

  async resume() {
    await NativeModules.AudioPlayer.resume();
  },

  subscribe(set, get) {
    const emitter = new NativeEventEmitter(NativeModules.AudioPlayer);
    const sub = emitter.addListener('playbackStateChanged', ({isPlaying, ended}) => {
      set('music.now-playing.is-playing', isPlaying);

      if (ended) {
        return player.next(set, get);
      }
    });
    return () => sub.remove();
  },
};
