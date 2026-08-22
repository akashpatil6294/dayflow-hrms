type WebSocketListener = (event: any) => void;

class RealtimeClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private listeners: Set<WebSocketListener> = new Set();
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private isConnecting: boolean = false;

  public connect(token?: string) {
    if (token) this.token = token;
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) return;

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws${this.token ? `?token=${this.token}` : ''}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log('[Dayflow WS] Connected to realtime engine');
        if (this.token) {
          this.ws?.send(JSON.stringify({ type: 'auth', token: this.token }));
        }

        // Heartbeat
        this.pingInterval = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.listeners.forEach((cb) => {
            try {
              cb(data);
            } catch (err) {
              console.error('Error in WS subscriber callback:', err);
            }
          });
        } catch (e) {
          console.error('Invalid WS message payload:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.cleanup();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
        this.cleanup();
        this.scheduleReconnect();
      };
    } catch (err) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, 4000);
  }

  private cleanup() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = null;
    this.ws = null;
  }

  public disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
    this.cleanup();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public subscribe(callback: WebSocketListener) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const realtime = new RealtimeClient();
