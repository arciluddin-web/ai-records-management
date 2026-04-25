import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from './auth';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    req.user = verifyToken(authHeader.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
