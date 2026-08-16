import express from 'express';
import { apiRouter } from '../server/routes/api.js';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Mount API routes
app.use('/api', apiRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Conversion Bridge (Vercel Serverless)' });
});

export default app;
