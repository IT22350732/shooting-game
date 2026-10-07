import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { WebSocketServer, WebSocket } from 'ws'

function multiplayerWebSocketPlugin(): Plugin {
  return {
    name: 'multiplayer-ws-relay',
    configureServer(server) {
      if (!server.httpServer) return;
      const wss = new WebSocketServer({ noServer: true });
      const rooms = new Map<string, { clients: Map<WebSocket, any> }>();

      server.httpServer.on('upgrade', (request, socket, head) => {
        const pathname = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`).pathname;
        if (pathname === '/api/multiplayer-ws') {
          wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
          });
        }
      });

      wss.on('connection', (ws) => {
        let currentRoomId: string = 'GLOBAL';
        let currentPlayerId: string | null = null;

        ws.on('message', (data) => {
          try {
            const packet = JSON.parse(data.toString());
            const targetRoomId: string = packet.roomId || (packet.room && packet.room.roomId) || currentRoomId;

            if (packet.type === 'PLAYER_JOIN' && packet.player) {
              currentRoomId = targetRoomId;
              currentPlayerId = packet.player.id;
              if (!rooms.has(currentRoomId)) {
                rooms.set(currentRoomId, { clients: new Map() });
              }
              const room = rooms.get(currentRoomId)!;
              room.clients.set(ws, packet.player);

              // Broadcast to all other clients in the room
              const json = JSON.stringify(packet);
              for (const [client] of room.clients) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(json);
                }
              }
              return;
            }

            if (targetRoomId) {
              currentRoomId = targetRoomId;
              if (!rooms.has(currentRoomId)) {
                rooms.set(currentRoomId, { clients: new Map() });
              }
              const room = rooms.get(currentRoomId)!;
              if (!room.clients.has(ws)) {
                room.clients.set(ws, null);
              }
              const json = JSON.stringify(packet);
              for (const [client] of room.clients) {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                  client.send(json);
                }
              }
            }
          } catch (err) {
            console.warn('[Multiplayer WS Relay] Error processing message:', err);
          }
        });

        ws.on('close', () => {
          if (currentRoomId && rooms.has(currentRoomId)) {
            const room = rooms.get(currentRoomId)!;
            room.clients.delete(ws);
            if (currentPlayerId) {
              const leaveJson = JSON.stringify({
                type: 'PLAYER_LEAVE',
                playerId: currentPlayerId,
                roomId: currentRoomId
              });
              for (const [client] of room.clients) {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(leaveJson);
                }
              }
            }
            if (room.clients.size === 0) {
              rooms.delete(currentRoomId);
            }
          }
        });
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), multiplayerWebSocketPlugin()],
})
