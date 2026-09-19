import {useEffect, useRef} from 'react';

import {fileSystem} from '../fileSystem';

const RETRY_MS = [1000, 2000, 5000, 10000];

/**
 * File changes in the project, as the server sees them. `onChanges` gets the
 * batched list; the socket reconnects on its own for as long as the page is
 * mounted, with a backoff so a server that is down is not hammered.
 */
export function useProjectEvents(projectRoot, onChanges, {enabled = true} = {}) {
  const handler = useRef(onChanges);
  handler.current = onChanges;

  useEffect(() => {
    if (!projectRoot || !enabled) {
      return undefined;
    }

    let socket = null;
    let attempt = 0;
    let timer = null;
    let closed = false;

    const connect = () => {
      if (closed) {
        return;
      }

      try {
        socket = new WebSocket(fileSystem.eventsUrl(projectRoot));
      } catch (error) {
        schedule();
        return;
      }

      socket.onopen = () => {
        attempt = 0;
      };

      socket.onmessage = event => {
        let message;
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          return;
        }

        if (message.type === 'fs') {
          handler.current?.(message.changes);
        }
      };

      socket.onclose = () => {
        socket = null;
        schedule();
      };

      socket.onerror = () => {
        // onclose follows; the retry is scheduled there.
      };
    };

    const schedule = () => {
      if (closed) {
        return;
      }
      const delay = RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)];
      attempt++;
      timer = setTimeout(connect, delay);
    };

    connect();

    return () => {
      closed = true;
      clearTimeout(timer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, [projectRoot, enabled]);
}
