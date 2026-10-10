import {useEffect, useRef} from 'react';

import {BASE_URL} from './api';
import secrets from './secerts.json';

// A minimal Action Cable client: one shared socket, reopened with backoff when
// it drops. `@rails/actioncable` leans on `document`, which React Native lacks.
const listeners = new Map(); // channel name -> Set of callbacks
let socket = null;
let retries = 0;

function cableUrl() {
  const base = BASE_URL.startsWith('/') ? window.location.origin + BASE_URL : BASE_URL;
  return base.replace(/^http/, 'ws') + '/cable?token=' + encodeURIComponent(secrets.API_KEY);
}

function identifier(channel) {
  return JSON.stringify({channel});
}

function subscribe(channel) {
  socket?.readyState === WebSocket.OPEN && socket.send(JSON.stringify({command: 'subscribe', identifier: identifier(channel)}));
}

function open() {
  socket = new WebSocket(cableUrl(), ['actioncable-v1-json']);

  socket.onmessage = event => {
    const data = JSON.parse(event.data);
    if (data.type === 'welcome') {
      retries = 0;
      listeners.forEach((_, channel) => subscribe(channel));
    } else if (data.message && data.identifier) {
      const {channel} = JSON.parse(data.identifier);
      listeners.get(channel)?.forEach(callback => callback(data.message));
    }
  };

  socket.onclose = () => {
    socket = null;
    if (listeners.size === 0) return;
    setTimeout(() => listeners.size > 0 && !socket && open(), Math.min(30000, 1000 * 2 ** retries++));
  };
}

// Calls `onMessage` for every broadcast on `channel` while mounted.
export function useChannel(channel, onMessage) {
  const callback = useRef(onMessage);
  callback.current = onMessage;

  useEffect(() => {
    const listener = message => callback.current(message);
    if (!listeners.has(channel)) {
      listeners.set(channel, new Set());
      subscribe(channel);
    }
    listeners.get(channel).add(listener);
    if (!socket) open();

    return () => {
      listeners.get(channel).delete(listener);
      if (listeners.get(channel).size > 0) return;
      listeners.delete(channel);
      socket?.readyState === WebSocket.OPEN && socket.send(JSON.stringify({command: 'unsubscribe', identifier: identifier(channel)}));
      if (listeners.size === 0) socket?.close();
    };
  }, [channel]);
}
