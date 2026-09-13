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

  async playPlaylist(songs, set, get, atIndex = 0) {
    const songsForQueue = [...songs];

    const songToPlay = songsForQueue[atIndex]; 

    // Push the songs before the index into previous songs
    const previousSongs = songsForQueue.slice(0, atIndex);
    set('music.last-songs', previousSongs);

    songsForQueue.splice(atIndex, 1);

    set('music.queue', songsForQueue);
    if (songsForQueue.length > 0) {
      await player.play(songToPlay, set);
    }
  },

  async next(set, get) {
    const queue = get('music.queue');
    if (queue && queue.length > 0) {
      const nextSong = queue.shift();
      set('music.queue', queue);
      await player.play(nextSong, set);
    }
  },

  async previous(set, get) {
    const queue = get('music.queue');
    const lastSongs = get('music.last-songs') || [];
    if (lastSongs.length > 0) {
      const previousSong = lastSongs.pop();
      set('music.last-songs', lastSongs);
      if (queue) {
        queue.unshift(previousSong);
        set('music.queue', queue);
      }
      await player.play(previousSong, set);
    }
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

      console.log('Playback state changed:', {isPlaying, ended});

      if (!isPlaying || !ended) {
        return;
      }

      const queue = get('music.queue');

      const justFinished = get('music.now-playing');
      const lastSongs = get('music.last-songs') || [];
      lastSongs.push(justFinished);
      set('music.last-songs', lastSongs);

      if (queue && queue.length > 0) {
        console.log('Queue before playing next song:', queue);
        set('music.now-playing', queue[0]);

        queue.shift();

        set('music.queue', queue);
      }

      player.play(queue[0], set);
    });
    return () => sub.remove();
  },
};
