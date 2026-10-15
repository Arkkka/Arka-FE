import type { AppServerMessage } from '@/schemas';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createAppSocket, type AppSocket, type AppSocketStatus } from '@/lib';

export function useSessionSocket(sessionId: string | null) {
  const [status, setStatus] = useState<AppSocketStatus>('CONNECTING');
  const [message, setMessage] = useState<AppServerMessage | null>(null);
  const [protocolError, setProtocolError] = useState<string | null>(null);
  const socketRef = useRef<AppSocket | null>(null);

  useEffect(() => {
    setMessage(null);
    setProtocolError(null);
    if (!sessionId) {
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
          next.type === 'session.snapshot' &&
            ['ABORTED', 'INTERRUPTED', 'SAVED', 'SAVE_FAILED'].includes(next.payload.status)
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
    connection.subscribeSession(sessionId);
    return () => {
      active = false;
      if (socketRef.current === connection) socketRef.current = null;
      connection.close();
    };
  }, [sessionId]);

  const close = useCallback(() => {
    const connection = socketRef.current;
    socketRef.current = null;
    connection?.close();
  }, []);

  return {
    status,
    message,
    protocolError,
    reconnect() {
      socketRef.current?.reconnect();
    },
    close,
    sendCommand(command: 'PAUSE' | 'RESUME' | 'ABORT') {
      const connection = socketRef.current;
      return (
        sessionId !== null && connection !== null && connection.sendCommand(sessionId, command)
      );
    },
  };
}
