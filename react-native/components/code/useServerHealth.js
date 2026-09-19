import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import {fileSystem} from '../fileSystem';

const UP_INTERVAL = 30000;
const DOWN_INTERVAL = 3000;

/**
 * Is the file server there? Polled slowly while it is and quickly while it is
 * not, so a restart is noticed within a few seconds. `info` is the health
 * payload — which language servers this machine has, mainly.
 */
export function useServerHealth() {
  const [up, setUp] = useState(null);
  const [info, setInfo] = useState(null);
  const timer = useRef(null);
  const alive = useRef(true);

  const check = useCallback(async () => {
    try {
      const health = await fileSystem.health();
      if (alive.current) {
        setInfo(health);
        setUp(true);
      }
      return true;
    } catch (error) {
      if (alive.current) {
        setUp(false);
      }
      return false;
    }
  }, []);

  useEffect(() => {
    alive.current = true;

    const loop = async () => {
      const ok = await check();
      if (alive.current) {
        timer.current = setTimeout(loop, ok ? UP_INTERVAL : DOWN_INTERVAL);
      }
    };

    loop();

    return () => {
      alive.current = false;
      clearTimeout(timer.current);
    };
  }, [check]);

  /** Called on a failed request, so the banner appears without waiting for the poll. */
  const markDown = useCallback(() => {
    setUp(false);
    clearTimeout(timer.current);
    const loop = async () => {
      const ok = await check();
      if (alive.current) {
        timer.current = setTimeout(loop, ok ? UP_INTERVAL : DOWN_INTERVAL);
      }
    };
    timer.current = setTimeout(loop, DOWN_INTERVAL);
  }, [check]);

  return useMemo(() => ({up, info, refresh: check, markDown}), [up, info, check, markDown]);
}
