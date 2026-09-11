import React, {createContext, useCallback, useContext, useMemo} from 'react';

import {api} from '../api';
import {player} from '../music/player';

// Lives at the App level so playback state survives switching pages. The
// audio itself is held natively (or in a module-level <audio> on web), so
// this context only mirrors state and exposes controls.
const PlayerContext = createContext(null);

export function PlayerProvider({children}) {
  const play = useCallback(async (url) => {
    await player.play(url, {
      title: 'sunny',
      artist: "bonny",
      album: "sunny's album",
      artwork: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTkwB_2pHUFCpbcaaUgqtfBj3xAmsGWFtzUN1YNFpn4_PoMdrPRXRSrq0Q&s=10",
    }, {Authorization: api.defaultHeaders.Authorization});
  }, []);

  const value = useMemo(
    () => ({play}),
    [play],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  return ctx;
}
