import type { AppServerMessage } from '@/schemas';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createAppSocket, type AppSocket, type AppSocketStatus } from '@/lib';

export function useSetupSocket(setupId: string | null) {
  const [status, setStatus] = useState<AppSocketStatus>('CONNECTING');
  const [message, setMessage] = useState<AppServerMessage | null>(null);
  const socketRef = useRef<AppSocket | null>(null);
  const [protocolError, setProtocolError] = useState<string | null>(null);

  useEffect(() => {
    setMessage(null);
    setProtocolError(null);
    if (!setupId) {
      setStatus('CLOSED');
      return;
    }
    let active = true;
    setStatus('CONNECTING');
    const connection = createAppSocket({
      onMessage: (next) => {
        if (!active) return;
        if (next.type === 'app.error') {
          setProtocolError(next.payload.message);
          return;
        }
        setProtocolError(null);
        setMessage(next);
        if (
          next.type === 'setup.snapshot' &&
          (next.payload.state === 'CANCELLED' || next.payload.state === 'EXPIRED')
        ) {
          socketRef.current = null;
          connection.close();
        }
      },
      onStatus: (next) => {
        if (active) setStatus(next);
      },
      onProtocolError: (next) => {
        if (active) setProtocolError(next);
      },
    });
    socketRef.current = connection;
    connection.subscribeSetup(setupId);
    return () => {
      active = false;
      if (socketRef.current === connection) socketRef.current = null;
      connection.close();
    };
  }, [setupId]);

  const close = useCallback(() => {
    const connection = socketRef.current;
    socketRef.current = null;
    connection?.close();
  }, []);

  return { status, message, protocolError, reconnect: () => socketRef.current?.reconnect(), close };
}
