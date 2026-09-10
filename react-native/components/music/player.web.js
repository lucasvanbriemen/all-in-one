/* global Audio, MediaMetadata */
// Browser implementation: an <audio> element plus the Media Session API, which
// feeds the same "Now Playing" surfaces (media keys, Chrome's media hub,
// macOS Now Playing widget) that MPNowPlayingInfoCenter does natively.
const audio = typeof Audio !== 'undefined' ? new Audio() : null;
const stateHandlers = new Set();
const commandHandlers = new Set();
let metadata = {};

function emitState(extra = {}) {
  const body = {
    isPlaying: audio ? !audio.paused && !audio.ended : false,
    position: audio?.currentTime ?? 0,
    duration: Number.isFinite(audio?.duration) ? audio.duration : 0,
    ended: audio?.ended ?? false,
    ...extra,
  };
  stateHandlers.forEach(h => h(body));
}

function emitCommand(command) {
  commandHandlers.forEach(h => h(command));
}

function updateSession() {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: metadata.title ?? '',
    artist: metadata.artist ?? '',
    album: metadata.album ?? '',
    artwork: metadata.artwork ? [{src: metadata.artwork}] : [],
  });
  navigator.mediaSession.playbackState = audio && !audio.paused ? 'playing' : 'paused';
}

if (audio) {
  ['play', 'pause', 'ended', 'timeupdate', 'durationchange'].forEach(e =>
    audio.addEventListener(e, () => {
      emitState();
      if (e === 'play' || e === 'pause') updateSession();
      if (e === 'ended') emitCommand('ended');
    }),
  );
  audio.addEventListener('error', () =>
    emitState({error: audio.error?.message ?? 'Playback failed'}),
  );

  if ('mediaSession' in navigator) {
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => { audio.play(); emitCommand('play'); });
    ms.setActionHandler('pause', () => { audio.pause(); emitCommand('pause'); });
    ms.setActionHandler('nexttrack', () => emitCommand('next'));
    ms.setActionHandler('previoustrack', () => emitCommand('previous'));
    try {
      ms.setActionHandler('seekto', d => { audio.currentTime = d.seekTime; });
    } catch {}
  }
}

export const player = {
  // Browsers can't attach headers to an <audio> src, so the token is passed
  // as a query param instead — the API accepts `auth_token` as well.
  play: async (url, meta = {}, headers = {}) => {
    if (!audio) return;
    metadata = meta;
    const token = headers.Authorization?.replace(/^Bearer /, '');
    const u = new URL(url);
    if (token) u.searchParams.set('auth_token', token);
    audio.src = u.toString();
    updateSession();
    await audio.play();
  },
  pause: () => audio?.pause(),
  resume: () => audio?.play(),
  stop: () => {
    if (!audio) return;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    emitState();
  },
  seek: seconds => { if (audio) audio.currentTime = seconds; },
  updateMetadata: meta => { metadata = meta; updateSession(); },

  onStateChange: handler => {
    stateHandlers.add(handler);
    return () => stateHandlers.delete(handler);
  },
  onRemoteCommand: handler => {
    commandHandlers.add(handler);
    return () => commandHandlers.delete(handler);
  },
};
