import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db';
import authRouter from './auth';
import documentsRouter from './routes/documents';
import aiRouter from './routes/ai';

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/auth', authRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/ai', aiRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

const MAX_DB_RETRIES = 5;
const DB_RETRY_DELAY_MS = 3000;

async function connectWithRetry(attempt = 1): Promise<void> {
  try {
    await initDb();
    console.log('Database initialized successfully.');
  } catch (err: any) {
    console.error(`Database initialization failed (attempt ${attempt}/${MAX_DB_RETRIES}):`, err.message);
    if (attempt < MAX_DB_RETRIES) {
      console.log(`Retrying in ${DB_RETRY_DELAY_MS / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, DB_RETRY_DELAY_MS));
      return connectWithRetry(attempt + 1);
    }
    console.error('All database connection attempts failed. The service will continue running but database features will be unavailable.');
  }
}

connectWithRetry();
