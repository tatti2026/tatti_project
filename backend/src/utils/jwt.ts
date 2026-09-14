import jwt from 'jsonwebtoken';
import { config } from '../config/environment.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'student' | 'admin';
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  } catch {
    return null;
  }
}
