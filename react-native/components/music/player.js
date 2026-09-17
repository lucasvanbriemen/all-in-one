import {NativeEventEmitter, NativeModules} from 'react-native';

import secrets from '../secerts.json';

const BASE_URL = "https://aio.ltvb.nl/get-mp3/";

export const player = {
  GO_BACK_TO_START_OF_SONG_AFTER_SECONDS: 5,

  async play(song, set) {
    await NativeModules.AudioPlayer.play(BASE_URL + song.isrc, {
      title: song.title,
      artist: song.artist,
      album: song.album,
      artwork: song.image_url,
    }, { Authorization: `Bearer ${secrets.API_KEY}` });

    set('music.now-playing', song);
  },

  async playPlaylist(songs, set, atIndex = null) {
    // If we have no specific starting index, shuffle the songs first.
    if (atIndex == null) {
      songs.sort(() => Math.random() - 0.5);
      atIndex = 0;
    }

    const songToPlay = songs[atIndex];

    set('music.last-songs', songs.slice(0, atIndex));

    let songsToCome = songs.slice(atIndex + 1);
    songsToCome.sort(() => Math.random() - 0.5);

    set('music.queue', songsToCome);

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
    // Like most players: past the first few seconds, "previous" restarts the
    // current song; before that, it jumps to the actual previous song.
    const position = await NativeModules.AudioPlayer.currentTime();
    if (get('music.now-playing') && position > player.GO_BACK_TO_START_OF_SONG_AFTER_SECONDS) {
      NativeModules.AudioPlayer.seek(0);
      return;
    }

    const queue = get('music.queue') || [];
    const lastSongs = get('music.last-songs') || [];
    if (lastSongs.length === 0) {
      NativeModules.AudioPlayer.seek(0);
      return;
    }

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
    const stateSub = emitter.addListener('playbackStateChanged', ({isPlaying, ended}) => {
      set('music.now-playing.is-playing', isPlaying);

      if (ended) {
        return player.next(set, get);
      }
    });
    const commandSub = emitter.addListener('remoteCommand', ({command}) => {
      if (command === 'next') return player.next(set, get);
      if (command === 'previous') return player.previous(set, get);
    });
    return () => {
      stateSub.remove();
      commandSub.remove();
    };
  },
};
