import {api, BASE_URL as API_BASE_URL} from '../api';
import secrets from '../secerts.json';

// Same-origin via the Vite proxy, like every other request on web.
const BASE_URL = `${API_BASE_URL}/get-mp3/`;

/**
 * Web stand-in for the native `AudioPlayer` module: one shared
 * HTMLAudioElement. Same method surface as `player.js` so the music screens
 * don't branch on platform.
 *
 * The native player sends the API key as a request header. `<audio>` can't
 * set headers, so the stream is fetched and played from an object URL.
 */
const audio = typeof Audio !== 'undefined' ? new Audio() : null;
const listeners = new Set();
let objectUrl = null;

function emit(payload) {
  listeners.forEach(listener => listener(payload));
}

if (audio) {
  audio.addEventListener('play', () => emit({isPlaying: true, ended: false}));
  audio.addEventListener('pause', () => {
    if (!audio.ended) emit({isPlaying: false, ended: false});
  });
  audio.addEventListener('ended', () => emit({isPlaying: false, ended: true}));
}

async function loadSource(url) {
  const response = await fetch(url, {
    headers: {Authorization: `Bearer ${secrets.API_KEY}`},
  });
  if (!response.ok) {
    throw new Error(`Audio request failed: ${response.status}`);
  }
  const blob = await response.blob();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(blob);
  audio.src = objectUrl;
}

function setMediaSession(song) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title,
    artist: song.artist,
    album: song.album,
    artwork: song.image_url ? [{src: song.image_url}] : [],
  });
}

export const player = {
  GO_BACK_TO_START_OF_SONG_AFTER_SECONDS: 5,
  playInterval: null,

  async play(song, set, get) {
    await loadSource(BASE_URL + song.id);
    setMediaSession(song);
    await audio.play();

    set('music.now-playing', song);

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
    const position = await player.currentTime();
    if (get('music.now-playing') && position > player.GO_BACK_TO_START_OF_SONG_AFTER_SECONDS) {
      audio.currentTime = 0;
      return;
    }

    const queue = get('music.queue') || [];
    const lastSongs = get('music.last-songs') || [];
    if (lastSongs.length === 0) {
      audio.currentTime = 0;
      return;
    }

    const currentlyPlaying = get('music.now-playing');
    const previousSong = lastSongs[lastSongs.length - 1];
    set('music.last-songs', lastSongs.slice(0, -1));
    set('music.queue', currentlyPlaying ? [currentlyPlaying, ...queue] : [...queue]);
    await player.play(previousSong, set, get);
  },

  async playFromQuery(query, set, get) {
    const results = await api.get('/music/search?use_liked_songs=true&term=' + encodeURIComponent(query));
    if (!results || results.length === 0) {
      return;
    }
    await player.play(results[0], set, get);
  },

  toggleRepeat(set, get) {
    player.setRepeat(!get('music.repeat'), set);
  },

  setRepeat(enabled, set) {
    set('music.repeat', enabled);
  },

  async repeatCurrent() {
    audio.currentTime = 0;
    await audio.play();
  },

  async pause() {
    audio.pause();
  },

  async resume() {
    await audio.play();
  },

  async currentTime() {
    return audio ? audio.currentTime : 0;
  },

  subscribe(set, get) {
    const onState = ({isPlaying, ended}) => {
      set('music.now-playing.is-playing', isPlaying);

      if (ended) {
        if (get('music.repeat')) return player.repeatCurrent();
        return player.next(set, get);
      }
    };
    listeners.add(onState);

    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('nexttrack', () => player.next(set, get));
      navigator.mediaSession.setActionHandler('previoustrack', () => player.previous(set, get));
      navigator.mediaSession.setActionHandler('play', () => player.resume());
      navigator.mediaSession.setActionHandler('pause', () => player.pause());
    }

    return () => {
      listeners.delete(onState);
    };
  },

  async createPlay(songId) {
    try {
      const seconds_played = await player.currentTime();
      await api.post('/music/stats/create', {song_id: songId, seconds_played});
    } catch (error) {
      console.error('Error creating play:', error);
    }
  },
};
