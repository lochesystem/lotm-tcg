import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './rooms/RoomManager.js';
import { setupSocketHandlers } from './game/socketHandlers.js';
import { initDatabase } from './db/database.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: RoomManager.getInstance().getRoomCount() });
});

// Initialize
const db = initDatabase();
const roomManager = RoomManager.getInstance();

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  setupSocketHandlers(io, socket, roomManager, db);

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    roomManager.handleDisconnect(socket.id);
  });
});

// Cleanup expired rooms every 30s
setInterval(() => {
  roomManager.cleanupExpired();
}, 30000);

httpServer.listen(PORT, () => {
  console.log(`LOTM TCG Server running on port ${PORT}`);
});
