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
    const songsForQueue = [...songs];

    const songToPlay = songsForQueue[atIndex]; 

    // Pull the song to the front of the queue
    songsForQueue.splice(atIndex, 1);
    songsForQueue.unshift(songToPlay);

    set('music.queue', songsForQueue);
    if (songsForQueue.length > 0) {
      await player.play(songToPlay, set);
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
