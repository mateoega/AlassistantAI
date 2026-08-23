import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { assistantRouter } from './routes/assistant.js';
import { catalogRouter } from './routes/catalog.js';
import { favoritesRouter } from './routes/favorites.js';
import { listingsRouter } from './routes/listings.js';
import { profileRouter } from './routes/profile.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

const app = express();

app.use(cors({ origin: env.allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'aiassistant-backend' });
});

app.use('/api/catalog', catalogRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/profile', profileRouter);
app.use('/api/assistant', assistantRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Backend de AIassistant escuchando en http://localhost:${env.port}`);
});
