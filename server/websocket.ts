import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import { verifyToken, JwtPayload } from './auth.js';

interface AuthenticatedWebSocket extends WebSocket {
  isAlive: boolean;
  user?: JwtPayload;
}

let wss: WebSocketServer | null = null;
const clients = new Set<AuthenticatedWebSocket>();

export function initWebSocket(server: HttpServer) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    ws.isAlive = true;

    // Authenticate via query param or header
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        ws.user = payload;
      }
    }

    clients.add(ws);

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'auth' && data.token) {
          const payload = verifyToken(data.token);
          if (payload) {
            ws.user = payload;
            ws.send(JSON.stringify({ type: 'auth_success', user: payload }));
          } else {
            ws.send(JSON.stringify({ type: 'auth_error', message: 'Invalid token' }));
          }
        } else if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch (e) {
        console.error('WS message error:', e);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', () => {
      clients.delete(ws);
    });

    // Send initial connected event
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Dayflow Realtime Engine active',
      timestamp: Date.now()
    }));
  });

  // Heartbeat interval
  const interval = setInterval(() => {
    clients.forEach((ws) => {
      if (!ws.isAlive) {
        clients.delete(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  return wss;
}

export function broadcastToUser(userId: string, data: any) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.user?.userId === userId) {
      client.send(message);
    }
  });
}

export function broadcastToRole(role: 'admin' | 'employee', data: any) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client.user?.role === role) {
      client.send(message);
    }
  });
}

export function broadcastToAll(data: any) {
  const message = JSON.stringify(data);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
