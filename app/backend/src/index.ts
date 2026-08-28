import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { assistantRouter } from './routes/assistant.js';
import { catalogRouter } from './routes/catalog.js';
import { conversationsRouter } from './routes/conversations.js';
import { favoritesRouter } from './routes/favorites.js';
import { listingsRouter } from './routes/listings.js';
import { profileRouter } from './routes/profile.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

const app = express();

/**
 * Detrás del proxy de Render, `req.ip` es la dirección del proxy y no la de la
 * persona: sin esto, TODOS los visitantes sin cuenta serían el mismo para el
 * límite de consumo de IA y el primero que preguntara mucho dejaría afuera a
 * los demás. El `1` es la cantidad de proxies en el camino —el de Render— y no
 * `true`: confiar en toda la cadena deja que cualquiera se invente su
 * dirección mandando un encabezado.
 */
app.set('trust proxy', 1);

app.use(cors({ origin: env.allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'aiassistant-backend' });
});

app.use('/api/catalog', catalogRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/assistant', assistantRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Backend de AIassistant escuchando en http://localhost:${env.port}`);
});
