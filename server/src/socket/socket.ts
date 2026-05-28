import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { getRedis } from '../config/redis';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) { next(new Error('Unauthorized')); return; }

    try {
      const payload = verifyAccessToken(token);
      (socket as Socket & { userId: string; userEmail: string }).userId = payload.userId;
      (socket as Socket & { userEmail: string }).userEmail = payload.email;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const s = socket as Socket & { userId: string; userEmail: string };
    logger.debug('Socket connected', { userId: s.userId });

    socket.join(`user:${s.userId}`);

    const redis = getRedis();
    redis.setex(`presence:${s.userEmail}`, 30, '1');

    socket.emit('connected', { userId: s.userId });

    socket.on('join_folder', (data: { folder: string }) => {
      socket.join(`folder:${s.userId}:${data.folder}`);
    });

    socket.on('leave_folder', (data: { folder: string }) => {
      socket.leave(`folder:${s.userId}:${data.folder}`);
    });

    socket.on('disconnect', () => {
      redis.del(`presence:${s.userEmail}`);
      logger.debug('Socket disconnected', { userId: s.userId });
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  getIO().to(`user:${userId}`).emit(event, data);
}
