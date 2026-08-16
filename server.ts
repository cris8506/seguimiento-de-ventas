import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { apiRouter } from './server/routes/api.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and URL-encoded body parser MUST be mounted before any routes
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Diagnostic request logger for developmental monitoring (METHOD PATH STATUS)
  app.use((req, res, next) => {
    res.on('finish', () => {
      if (req.path.startsWith('/api') || req.originalUrl.startsWith('/api')) {
        console.log(`${req.method} ${req.originalUrl || req.url} ${res.statusCode}`);
      }
    });
    next();
  });

  // Mount API router FIRST (all /api endpoints handled here)
  app.use('/api', apiRouter);

  // Vite middleware for development / static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Conversion Bridge server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
