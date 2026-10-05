// Dedicated WebSocket Multiplayer Relay Server for SHOOT ARENA
// Fast, lightweight, zero-dependency relay for rooms and state synchronization.

import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: Number(PORT) });

const rooms = new Map(); // roomId -> { config, clients: Map(ws -> player) }

console.log(`[SHOOT ARENA] Multiplayer Server running on port ${PORT}`);

wss.on('connection', (ws) => {
  let currentRoomId = null;
  let currentPlayerId = null;

  ws.on('message', (data) => {
    try {
      const packet = JSON.parse(data.toString());

      if (packet.type === 'PLAYER_JOIN' && packet.player) {
        currentRoomId = packet.roomId || 'GLOBAL';
        currentPlayerId = packet.player.id;

        if (!rooms.has(currentRoomId)) {
          rooms.set(currentRoomId, {
            config: { roomId: currentRoomId, status: 'lobby' },
            clients: new Map()
          });
        }

        const room = rooms.get(currentRoomId);
        room.clients.set(ws, packet.player);

        // Broadcast to all clients in the room
        broadcastToRoom(currentRoomId, packet, ws);
        return;
      }

      if (currentRoomId && rooms.has(currentRoomId)) {
        broadcastToRoom(currentRoomId, packet, ws);
      }
    } catch (err) {
      console.warn('Error handling client message:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && rooms.has(currentRoomId)) {
      const room = rooms.get(currentRoomId);
      room.clients.delete(ws);

      if (currentPlayerId) {
        broadcastToRoom(currentRoomId, {
          type: 'PLAYER_LEAVE',
          playerId: currentPlayerId
        });
      }

      if (room.clients.size === 0) {
        rooms.delete(currentRoomId);
      }
    }
  });
});

function broadcastToRoom(roomId, packet, senderWs) {
  const room = rooms.get(roomId);
  if (!room) return;
  const json = JSON.stringify(packet);
  for (const [client] of room.clients) {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(json);
    }
  }
}
