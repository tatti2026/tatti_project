import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { generateToken } from '../utils/jwt.js';
import { query } from '../database/pgPool.js';

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Allow login with email OR student_id (student_id stored in students table)
    let userRow = null;

    // First try direct email login
    const emailResult = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (emailResult.rows.length > 0) {
      userRow = emailResult.rows[0];
    } else {
      // Try student_id lookup
      const sidResult = await query(
        `SELECT u.* FROM users u
         JOIN profiles p ON p.id = u.id
         JOIN students s ON s.profile_id = p.id
         WHERE s.student_id = $1`,
        [email]
      );
      if (sidResult.rows.length > 0) {
        userRow = sidResult.rows[0];
      }
    }

    if (!userRow) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const passwordMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const profileResult = await query('SELECT * FROM profiles WHERE id = $1', [userRow.id]);
    const profile = profileResult.rows[0];
    const role = profile?.role || 'student';

    const token = generateToken({
      userId: userRow.id,
      email: userRow.email,
      role,
    });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: userRow.id,
        email: userRow.email,
        role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
}

export async function signup(req: Request, res: Response) {
  try {
    const {
      email,
      password,
      fullName,
      username,
      phone,
      parentName,
      parentPhone,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Basic validations
    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits.' });
    }
    if (parentPhone && !/^\d{10}$/.test(parentPhone)) {
      return res.status(400).json({ error: 'Parent phone number must be exactly 10 digits.' });
    }

    // Check if email already registered
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    // Check username uniqueness if provided
    if (username) {
      const uCheck = await query('SELECT id FROM students WHERE username = $1', [username]);
      if (uCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Username is already taken.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // ── Atomic Transaction ───────────────────────────────────────────────────
    await query('BEGIN');

    try {
      // 1. Insert user
      const userRes = await query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
        [email, passwordHash]
      );
      const user = userRes.rows[0];

      // 2. Insert profile
      await query(
        'INSERT INTO profiles (id, email, full_name, phone, role) VALUES ($1, $2, $3, $4, $5)',
        [user.id, email, fullName || username || '', phone || '', 'student']
      );

      // 3. Generate Student ID atomically using INSERT … ON CONFLICT DO UPDATE
      // This ensures no two concurrent signups get the same counter for a given year.
      const currentYear = new Date().getFullYear();
      const counterRes = await query(
        `INSERT INTO student_id_counters (year, counter)
         VALUES ($1, 1)
         ON CONFLICT (year) DO UPDATE
           SET counter = student_id_counters.counter + 1
         RETURNING counter`,
        [currentYear]
      );
      const counter = counterRes.rows[0].counter;
      const paddedCounter = String(counter).padStart(3, '0');
      const generatedStudentId = `${currentYear}-TATTI-${paddedCounter}`;

      // 4. Insert student record
      await query(
        `INSERT INTO students (profile_id, email, full_name, phone, username, parent_name, parent_phone, student_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user.id,
          email,
          fullName || username || '',
          phone || '',
          username || null,
          parentName || null,
          parentPhone || null,
          generatedStudentId,
        ]
      );

      await query('COMMIT');

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: 'student',
      });

      return res.status(201).json({
        message: 'Signup successful',
        token,
        studentId: generatedStudentId,
        user: {
          id: user.id,
          email: user.email,
          role: 'student',
        },
      });

    } catch (innerErr) {
      await query('ROLLBACK');
      throw innerErr;
    }

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error during signup' });
  }
}

export async function getMe(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const profileRes = await query('SELECT * FROM profiles WHERE id = $1', [userId]);
    if (profileRes.rows.length === 0) return res.status(404).json({ error: 'Profile not found' });

    return res.json({ profile: profileRes.rows[0] });
  } catch (err) {
    console.error('GetMe error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/auth/request-password-reset
 *
 * Accepts an email, generates a secure reset token, stores its hash in the DB,
 * and (in production) sends a reset link to the user.
 *
 * SECURITY:
 * - Always returns 200 regardless of whether the email exists (avoids enumeration).
 * - Token is stored as a bcrypt hash — the raw token is never persisted.
 * - Token expires in 1 hour.
 */
export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const { email } = req.body;
    if (!email) {
      // Still return 200 to avoid revealing account existence
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    // Lookup user — silently ignore if not found
    const userRes = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (userRes.rows.length > 0) {
      const userId = userRes.rows[0].id;

      // Generate a cryptographically secure random token (32 bytes = 64 hex chars)
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(rawToken, 10);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store the hashed token (upsert — one token per user at a time)
      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE
           SET token_hash = $2, expires_at = $3, created_at = now()`,
        [userId, tokenHash, expiresAt]
      );

      // In production: send email with the reset link
      // The link would be: https://your-domain.com/reset-password?token=<rawToken>&userId=<userId>
      //
      // Example (using nodemailer or similar):
      //   await sendEmail(email, 'Password Reset', `Click to reset: ${resetLink}`);
      //
      // For now, log for development purposes:
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const resetLink = `${frontendUrl}/reset-password?token=${rawToken}&userId=${userId}`;
      console.log(`[DEV] Password reset link for ${email}: ${resetLink}`);
    }

    // Always return success
    return res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    console.error('RequestPasswordReset error:', err);
    // Still return success to avoid leaking information
    return res.json({ message: 'If that email is registered, a reset link has been sent.' });
  }
}

/**
 * POST /api/auth/reset-password
 *
 * Accepts { userId, token, newPassword }.
 * Validates the token against the stored hash, checks expiry, then updates the password.
 *
 * SECURITY:
 * - Constant-time comparison via bcrypt.
 * - Token is single-use: deleted after successful reset.
 * - Validates password length server-side.
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { userId, token, newPassword } = req.body;

    if (!userId || !token || !newPassword) {
      return res.status(400).json({ error: 'userId, token, and newPassword are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Fetch the stored token record
    const tokenRes = await query(
      'SELECT token_hash, expires_at FROM password_reset_tokens WHERE user_id = $1',
      [userId]
    );
    if (tokenRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const { token_hash, expires_at } = tokenRes.rows[0];

    // Check expiry
    if (new Date() > new Date(expires_at)) {
      await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    // Verify token via bcrypt (constant-time comparison)
    const tokenValid = await bcrypt.compare(token, token_hash);
    if (!tokenValid) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    // Update the user's password
    const newHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    // Invalidate the token (single-use)
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

    return res.json({ message: 'Password reset successfully. You can now sign in with your new password.' });
  } catch (err) {
    console.error('ResetPassword error:', err);
    return res.status(500).json({ error: 'Internal server error during password reset.' });
  }
}
