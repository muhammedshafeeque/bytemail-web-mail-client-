import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';
import { apiRateLimit } from './middleware/rateLimit.middleware';

import authRoutes from './routes/auth.routes';
import emailRoutes from './routes/email.routes';
import folderRoutes from './routes/folder.routes';
import contactRoutes from './routes/contact.routes';
import attachmentRoutes from './routes/attachment.routes';
import notificationRoutes from './routes/notification.routes';
import draftRoutes from './routes/draft.routes';
import settingsRoutes from './routes/settings.routes';

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', apiRateLimit);

app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/drafts', draftRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.use(errorMiddleware);

export default app;
