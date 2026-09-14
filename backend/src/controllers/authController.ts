import type { Request, Response } from 'express';
import { generateToken } from '../utils/jwt.js';

export async function login(req: Request, res: Response) {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  // Generate session token
  const token = generateToken({
    userId: `user-${Date.now()}`,
    email,
    role: role === 'admin' ? 'admin' : 'student',
  });

  return res.json({
    message: 'Login successful',
    token,
    user: {
      email,
      role: role === 'admin' ? 'admin' : 'student',
    },
  });
}
