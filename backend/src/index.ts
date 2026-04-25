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

initDb().catch(err => {
  console.error('Database initialization failed (documents will not work until DB is connected):', err.message);
});
