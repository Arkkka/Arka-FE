import {
  AppClientMessageSchema,
  AppServerMessageSchema,
  type AppClientMessage,
  type AppServerMessage,
} from '@/schemas';

export type AppSocketStatus = 'CONNECTING' | 'OPEN' | 'RECONNECTING' | 'CLOSED' | 'FAILED';

type Subscription =
  | { readonly kind: 'setup'; readonly id: string }
  | { readonly kind: 'session'; readonly id: string };

export interface AppSocketOptions {
  readonly onMessage: (message: AppServerMessage) => void;
  readonly onStatus: (status: AppSocketStatus) => void;
  readonly onProtocolError?: (message: string) => void;
}

export interface AppSocket {
  subscribeSetup(setupId: string): void;
  subscribeSession(sessionId: string): void;
  sendCommand(sessionId: string, command: 'PAUSE' | 'RESUME' | 'ABORT'): boolean;
  reconnect(): void;
  close(): void;
}

const MAX_RECONNECT_ATTEMPTS = 6;
const backendUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/u, '') ?? window.location.origin;

function socketUrl(): string {
  const url = new URL('/ws/app', backendUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

function messageId(): string {
  return crypto.randomUUID();
}

export function createAppSocket(options: AppSocketOptions): AppSocket {
  let socket: WebSocket | null = null;
  let subscription: Subscription | null = null;
  let lastSequence: number | undefined;
  let reconnectAttempts = 0;
  let reconnectTimer: number | undefined;
  let deliberatelyClosed = false;

  function status(next: AppSocketStatus): void {
    options.onStatus(next);
  }

  function send(message: AppClientMessage): boolean {
    const parsed = AppClientMessageSchema.safeParse(message);
    if (!parsed.success || socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify(parsed.data));
    return true;
  }

  function sendSubscription(): void {
    if (!subscription) return;
    if (subscription.kind === 'setup') {
      send({
        protocolVersion: 1,
        messageId: messageId(),
        type: 'app.setup.subscribe',
        payload: {
          setupId: subscription.id,
          ...(lastSequence === undefined ? {} : { cursor: lastSequence }),
        },
      });
      return;
    }
    send({
      protocolVersion: 1,
      messageId: messageId(),
      type: 'app.subscribe',
      payload: {
        sessionId: subscription.id,
        ...(lastSequence === undefined ? {} : { cursor: lastSequence }),
      },
    });
  }

  function scheduleReconnect(): void {
    if (deliberatelyClosed || !subscription) {
      status('CLOSED');
      return;
    }
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      status('FAILED');
      options.onProtocolError?.('Koneksi sesi tidak dapat dipulihkan. Akhiri sesi demi keamanan.');
      return;
    }
    reconnectAttempts += 1;
    status('RECONNECTING');
    const delayMs = Math.min(8_000, 500 * 2 ** (reconnectAttempts - 1));
    reconnectTimer = window.setTimeout(connect, delayMs);
  }

  function connect(): void {
    if (deliberatelyClosed || !subscription) return;
    if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING)
      return;
    status(reconnectAttempts === 0 ? 'CONNECTING' : 'RECONNECTING');
    const current = new WebSocket(socketUrl());
    socket = current;

    current.addEventListener('open', () => {
      if (socket !== current || deliberatelyClosed) return;
      reconnectAttempts = 0;
      status('OPEN');
      sendSubscription();
    });
    current.addEventListener('message', (event) => {
      if (socket !== current) return;
      if (typeof event.data !== 'string') {
        options.onProtocolError?.('Pesan sesi tidak valid diabaikan.');
        return;
      }
      let decoded: unknown;
      try {
        decoded = JSON.parse(event.data) as unknown;
      } catch {
        options.onProtocolError?.('Pesan sesi tidak valid diabaikan.');
        return;
      }
      const parsed = AppServerMessageSchema.safeParse(decoded);
      if (!parsed.success) {
        options.onProtocolError?.('Pesan sesi tidak sesuai protokol dan diabaikan.');
        return;
      }
      if (parsed.data.type === 'app.error') {
        options.onMessage(parsed.data);
        return;
      }
      const active = subscription;
      const belongsToActiveSubscription =
        (parsed.data.type === 'setup.snapshot' &&
          active?.kind === 'setup' &&
          parsed.data.setupId === active.id) ||
        (parsed.data.type === 'session.snapshot' &&
          active?.kind === 'session' &&
          parsed.data.sessionId === active.id);
      if (!belongsToActiveSubscription) return;
      if (lastSequence !== undefined && parsed.data.sequence <= lastSequence) return;
      lastSequence = parsed.data.sequence;
      options.onMessage(parsed.data);
    });
    current.addEventListener('close', () => {
      if (socket !== current) return;
      socket = null;
      scheduleReconnect();
    });
    current.addEventListener('error', () => current.close());
  }

  function changeSubscription(next: Subscription): void {
    const changed = subscription?.kind !== next.kind || subscription.id !== next.id;
    subscription = next;
    deliberatelyClosed = false;
    if (changed) {
      lastSequence = undefined;
      reconnectAttempts = 0;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      const previous = socket;
      socket = null;
      previous?.close(1000, 'Subscription changed');
      connect();
      return;
    }
    if (socket?.readyState === WebSocket.OPEN) sendSubscription();
    else connect();
  }

  return {
    subscribeSetup(setupId) {
      changeSubscription({ kind: 'setup', id: setupId });
    },
    subscribeSession(sessionId) {
      changeSubscription({ kind: 'session', id: sessionId });
    },
    sendCommand(sessionId, command) {
      if (subscription?.kind !== 'session' || subscription.id !== sessionId) return false;
      return send({
        protocolVersion: 1,
        messageId: messageId(),
        type: 'session.command',
        payload: { sessionId, command },
      });
    },
    reconnect() {
      if (!subscription) return;
      reconnectAttempts = 0;
      deliberatelyClosed = false;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      if (socket?.readyState === WebSocket.OPEN) sendSubscription();
      else connect();
    },
    close() {
      deliberatelyClosed = true;
      subscription = null;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      socket?.close(1000, 'Browser flow ended');
      socket = null;
      status('CLOSED');
    },
  };
}
