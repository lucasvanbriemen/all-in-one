import {NativeEventEmitter, NativeModules} from 'react-native';

import {api} from '../api';
import secrets from '../secerts.json';

const BASE_URL = "https://aio.ltvb.nl/get-mp3/";

export const player = {
  GO_BACK_TO_START_OF_SONG_AFTER_SECONDS: 5,
  playInterval: null,

  async play(song, set, get) {
    await NativeModules.AudioPlayer.play(BASE_URL + song.id, {
      title: song.title,
      artist: song.artist,
      album: song.album,
      artwork: song.image_url,
    }, { Authorization: `Bearer ${secrets.API_KEY}` });

    set('music.now-playing', song);

    // Get the next song and prepare the song
    const queue = get('music.queue') || [];
    if (queue.length > 0) {
      api.get(`/get-mp3/${queue[0].id}/prepare`);
    }

    await player.createPlay(song.id);

    clearInterval(player.playInterval);
    player.playInterval = setInterval(() => player.createPlay(song.id), 5000);
  },

  async playPlaylist(songs, set, atIndex = null, get) {
    let songsToShuffle = [...songs];
    if (atIndex == null) {
      songsToShuffle.sort(() => Math.random() - 0.5);
      atIndex = 0;
    }

    const songToPlay = songsToShuffle[atIndex];

    set('music.last-songs', songs.slice(0, atIndex));

    songsToShuffle = songsToShuffle.slice(atIndex + 1);
    songsToShuffle.sort(() => Math.random() - 0.5);

    set('music.queue', songsToShuffle);

    await player.play(songToPlay, set, get);
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
    await player.play(queue[0], set, get);
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
    await player.play(previousSong, set, get);
  },

  // "Hey Siri, play <query>"
  async playFromQuery(query, set, get) {
    const results = await api.get('/music/search?use_liked_songs=true&term=' + encodeURIComponent(query));
    if (!results || results.length === 0) {
      return;
    }
    await player.play(results[0], set, get);
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

    // macOS doesnt have SiriIntents.
    let siriSub = null;
    if (NativeModules.SiriIntents) {
      const siriEmitter = new NativeEventEmitter(NativeModules.SiriIntents);
      siriSub = siriEmitter.addListener('siriPlay', ({query}) => player.playFromQuery(query, set, get));
    }
    return () => {
      stateSub.remove();
      commandSub.remove();
      siriSub?.remove();
    };
  },

  async createPlay(songId){
    console.log('Creating play for', songId);

    try {
      const seconds_played = await NativeModules.AudioPlayer.currentTime();
      const response = await api.post('/music/stats/create', { song_id: songId, seconds_played });
      console.log('Play created successfully:', response);
    } catch (error) {
      console.error('Error creating play:', error);
    }
  }
};
