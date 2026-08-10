import express from 'express';
import cors from 'cors';

import { config } from './config/config.js';
import { logger } from './utils/logger.js';
import healthRoutes from './routes/healthRoutes.js';
import debugRoutes from './routes/debugRoutes.js';
import projectRoutes from './routes/projectRoutes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.frontendOrigin }));
  app.use(express.json({ limit: '2mb' }));

  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.originalUrl}`);
    next();
  });

  app.use('/api', healthRoutes);
  app.use('/api', debugRoutes);
  app.use('/api', projectRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: `Unbekannte Route: ${req.method} ${req.originalUrl}` });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    logger.error(err.message, { stack: err.stack });
    res.status(err.status ?? 500).json({ error: err.message });
  });

  return app;
}