import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type TokenPayload } from '../utils/jwt.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Missing or malformed token.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired session token.' });
  }

  req.user = payload;
  next();
}

export function requireRole(role: 'admin' | 'student' | 'counsellor' | Array<'admin' | 'student' | 'counsellor'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const allowedRoles = Array.isArray(role) ? role : [role];
    const userRole = req.user?.role.trim().toLowerCase();
    const normalizedAllowedRoles = allowedRoles.map(allowedRole => allowedRole.toLowerCase());
    if (!userRole || !normalizedAllowedRoles.includes(userRole)) {
      return res.status(403).json({ error: `Forbidden: Only ${allowedRoles.join(' or ')} accounts have permission.` });
    }
    next();
  };
}
