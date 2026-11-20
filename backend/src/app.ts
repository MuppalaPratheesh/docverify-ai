import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import adminRouter from './routes/admin';
import applicationsRouter from './routes/applications';
import authRouter from './routes/auth';
import documentTypesRouter from './routes/documentTypes';
import documentsRouter from './routes/documents';
import healthRouter from './routes/health';
import reviewerRouter from './routes/reviewer';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // Uploads are never exposed as static public files.
  app.get('/', (_req, res) => {
    res.status(200).json({
      success: true,
      data: {
        name: 'DocVerify AI API',
        version: '0.1.0',
        docs: '/api/health',
      },
    });
  });

  app.use('/api', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/applications', applicationsRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/document-types', documentTypesRouter);
  app.use('/api/reviewer', reviewerRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
