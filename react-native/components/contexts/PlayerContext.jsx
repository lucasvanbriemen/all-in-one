import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';

import {api} from '../api';
import {player} from '../music/player';

// Lives at the App level so playback state survives switching pages. The
// audio itself is held natively (or in a module-level <audio> on web), so
// this context only mirrors state and exposes controls.
const PlayerContext = createContext(null);

export function PlayerProvider({children}) {
  const [track, setTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const trackRef = useRef(null);

  useEffect(() => {
    const offState = player.onStateChange(state => {
      setIsPlaying(state.isPlaying);
      setPosition(state.position);
      setDuration(state.duration);
    });
    return offState;
  }, []);

  const play = useCallback(async (url, metadata = {}) => {
    const next = {url, ...metadata};
    trackRef.current = next;
    setTrack(next);
    try {
      await player.play(url, {
        title: metadata.title ?? '',
        artist: metadata.artist ?? '',
        album: metadata.album ?? '',
        artwork: metadata.artwork ?? '',
      }, {Authorization: api.defaultHeaders.Authorization});
    } catch (e) {
    }
  }, []);

  const pause = useCallback(() => player.pause(), []);
  const resume = useCallback(() => player.resume(), []);
  const stop = useCallback(() => {
    player.stop();
    trackRef.current = null;
    setTrack(null);
  }, []);
  const seek = useCallback(seconds => player.seek(seconds), []);

  const toggle = useCallback(() => {
    if (!trackRef.current) return;
    if (isPlaying) player.pause();
    else player.resume();
  }, [isPlaying]);

  // Expose remote commands (next/previous from Control Center, media keys…)
  // so a page can hook a queue onto them.
  const onRemoteCommand = useCallback(handler => player.onRemoteCommand(handler), []);

  const value = useMemo(
    () => ({track, isPlaying, position, duration, play, pause, resume, stop, seek, toggle, onRemoteCommand}),
    [track, isPlaying, position, duration, play, pause, resume, stop, seek, toggle, onRemoteCommand],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  return ctx;
}
