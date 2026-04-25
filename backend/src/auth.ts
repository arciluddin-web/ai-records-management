import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

export interface JwtPayload {
  userId: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

router.post('/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: 'Invalid password' });
    return;
  }
  const token = signToken({
    userId: 'admin',
    email: 'admin',
    displayName: 'Admin',
    photoUrl: null,
  });
  res.json({ token });
});

router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const payload = verifyToken(authHeader.slice(7));
    res.json({
      uid: payload.userId,
      email: payload.email,
      displayName: payload.displayName,
      photoURL: payload.photoUrl,
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.json({ success: true });
});

export default router;
