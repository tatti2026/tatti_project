import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { generateToken } from '../utils/jwt.js';
import { query } from '../database/pgPool.js';
import { sendPasswordResetEmail, verifyEmailConfiguration } from '../services/emailService.js';

// In-memory rate limiting map for password reset requests: key = IP or email, value = timestamps[]
const resetRateLimitMap = new Map<string, number[]>();

function checkResetRateLimit(identifier: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5; // max 5 attempts per 15 minutes

  const timestamps = (resetRateLimitMap.get(identifier) || []).filter(ts => now - ts < windowMs);
  if (timestamps.length >= maxAttempts) {
    return false;
  }
  timestamps.push(now);
  resetRateLimitMap.set(identifier, timestamps);
  return true;
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    const rawIdentifier = typeof email === 'string' ? email : '';
    const cleanIdentifier = rawIdentifier.trim();
    const hasIdentifierWhitespace = rawIdentifier !== cleanIdentifier;
    const rawPassword = typeof password === 'string' ? password : '';
    const hasPasswordWhitespace = rawPassword !== rawPassword.trim();

    console.log('[auth/login] Login attempt initiated', {
      identifierLength: cleanIdentifier.length,
      hasIdentifierWhitespace,
      passwordLength: rawPassword.length,
      hasPasswordWhitespace,
    });

    if (!cleanIdentifier || !rawPassword) {
      console.log('[auth/login] Failure stage: Missing identifier or password');
      return res.status(400).json({ error: 'Email/Student ID and password are required.' });
    }

    // Allow login with email OR student_id OR username
    let userRow: any = null;
    let lookupMethod: string = '';

    // 1. First try case-insensitive direct email login
    let emailResult = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [cleanIdentifier]);

    // 2. Fallback for .edu / .edu.in alias
    if (emailResult.rows.length === 0) {
      if (cleanIdentifier.toLowerCase().endsWith('@tatti.edu')) {
        emailResult = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [cleanIdentifier + '.in']);
        if (emailResult.rows.length > 0) lookupMethod = 'email_alias_edu_in';
      } else if (cleanIdentifier.toLowerCase().endsWith('@tatti.edu.in')) {
        emailResult = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [cleanIdentifier.slice(0, -3)]);
        if (emailResult.rows.length > 0) lookupMethod = 'email_alias_edu';
      }
    } else {
      lookupMethod = 'direct_email';
    }

    if (emailResult.rows.length > 0) {
      userRow = emailResult.rows[0];
    } else {
      // 3. Try student_id or username lookup (case-insensitive and trimmed)
      const sidResult = await query(
        `SELECT u.* FROM users u
         JOIN profiles p ON p.id = u.id
         JOIN students s ON s.profile_id = p.id
         WHERE UPPER(TRIM(s.student_id)) = UPPER($1)
            OR LOWER(TRIM(COALESCE(s.username, ''))) = LOWER($1)`,
        [cleanIdentifier]
      );
      if (sidResult.rows.length > 0) {
        userRow = sidResult.rows[0];
        lookupMethod = 'student_id_or_username';
      }
    }

    if (!userRow) {
      console.log('[auth/login] Failure stage: User not found in database for identifier', {
        identifierClean: cleanIdentifier,
        lookupAttempted: 'direct_email, alias, student_id, username',
      });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!userRow.password_hash) {
      console.log('[auth/login] Failure stage: Account has no password hash stored', {
        userId: userRow.id,
      });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // 4. Compare password with stored hash
    let passwordMatch = await bcrypt.compare(rawPassword, userRow.password_hash);
    let matchedAfterTrimming = false;

    // If direct comparison failed but password had accidental leading/trailing whitespace, test trimmed password
    if (!passwordMatch && hasPasswordWhitespace) {
      const trimmedMatch = await bcrypt.compare(rawPassword.trim(), userRow.password_hash);
      if (trimmedMatch) {
        passwordMatch = true;
        matchedAfterTrimming = true;
        console.log('[auth/login] Password matched after trimming unintended whitespace');
      }
    }

    if (!passwordMatch) {
      console.log('[auth/login] Failure stage: Password mismatch', {
        userId: userRow.id,
        userEmail: userRow.email,
        lookupMethod,
        inputPasswordLength: rawPassword.length,
      });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const profileResult = await query('SELECT * FROM profiles WHERE id = $1', [userRow.id]);
    const profile = profileResult.rows[0];
    const role = profile?.role || 'student';

    console.log('[auth/login] Success: Authentication complete', {
      userId: userRow.id,
      email: userRow.email,
      role,
      lookupMethod,
      matchedAfterTrimming,
    });

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
      profile: profile || null,
    });
  } catch (err) {
    console.error('[auth/login] Login error:', err);
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

    // Atomic Transaction
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

      // 3. Generate Student ID atomically using INSERT ON CONFLICT DO UPDATE
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
      const generatedStudentId = `${currentYear}-PSY CARE-${paddedCounter}`;

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

let isPasswordResetTableInitialized = false;

export async function ensurePasswordResetTable(): Promise<void> {
  if (isPasswordResetTableInitialized) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
      ON password_reset_tokens(user_id);
    `);
    isPasswordResetTableInitialized = true;
    console.log('[PSY CARE Backend] password_reset_tokens table ready.');
  } catch (err) {
    console.error('[PSY CARE Backend] Failed to ensure password_reset_tokens table:', err);
  }
}

/**
 * POST /api/auth/request-password-reset
 *
 * Accepts an email (or student ID), generates a secure single-use reset token,
 * stores its hash in password_reset_tokens table, and sends a branded reset link via email.
 *
 * SECURITY:
 * - Constant 200 response to prevent email enumeration.
 * - Raw token is 32 cryptographically random bytes (never logged or saved unhashed).
 * - Only bcrypt hash is stored in PostgreSQL.
 * - Expires in 1 hour.
 * - Rate limited by IP / identifier.
 */
export async function requestPasswordReset(req: Request, res: Response) {
  try {
    await ensurePasswordResetTable();
    const { email } = req.body;
    const cleanInput = typeof email === 'string' ? email.trim() : '';

    if (!cleanInput) {
      return res.status(400).json({ success: false, error: 'Please enter your registered email address or Student ID.' });
    }

    // Rate limiting check
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    const rateLimitKey = `${clientIp}:${cleanInput.toLowerCase()}`;
    if (!checkResetRateLimit(rateLimitKey)) {
      console.warn(`[auth/reset] Rate limit reached for ${rateLimitKey}`);
      return res.status(429).json({
        success: false,
        error: 'Too many reset requests. Please wait a few minutes before trying again.',
      });
    }

    // 1. Look up user by email (case-insensitive)
    let userRow: { id: string; email: string; full_name?: string; role?: string } | null = null;
    let userRes = await query(
      `SELECT u.id, u.email, p.full_name, p.role
       FROM users u
       LEFT JOIN profiles p ON p.id = u.id
       WHERE LOWER(TRIM(u.email)) = LOWER($1)`,
      [cleanInput]
    );

    // 2. Fallback for .edu / .edu.in alias if needed
    if (userRes.rows.length === 0) {
      if (cleanInput.toLowerCase().endsWith('@tatti.edu')) {
        userRes = await query(
          `SELECT u.id, u.email, p.full_name, p.role
           FROM users u
           LEFT JOIN profiles p ON p.id = u.id
           WHERE LOWER(TRIM(u.email)) = LOWER($1)`,
          [cleanInput + '.in']
        );
      } else if (cleanInput.toLowerCase().endsWith('@tatti.edu.in')) {
        userRes = await query(
          `SELECT u.id, u.email, p.full_name, p.role
           FROM users u
           LEFT JOIN profiles p ON p.id = u.id
           WHERE LOWER(TRIM(u.email)) = LOWER($1)`,
          [cleanInput.slice(0, -3)]
        );
      }
    }

    // 3. Fallback: check if the student entered their Student ID or student profile email
    if (userRes.rows.length === 0) {
      const studentRes = await query(
        `SELECT u.id, u.email, p.full_name, p.role
         FROM users u
         JOIN profiles p ON p.id = u.id
         JOIN students s ON s.profile_id = p.id
         WHERE UPPER(TRIM(s.student_id)) = UPPER($1)
            OR LOWER(TRIM(COALESCE(s.email, ''))) = LOWER($1)`,
        [cleanInput]
      );
      if (studentRes.rows.length > 0) {
        userRow = studentRes.rows[0];
      }
    } else {
      userRow = userRes.rows[0];
    }

    // If an account exists, generate and store secure token, then send email
    if (userRow) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await bcrypt.hash(rawToken, 10);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

      // Upsert into password_reset_tokens (one valid active token per user, invalidating any previous)
      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id) DO UPDATE
           SET token_hash = $2, expires_at = $3, created_at = now()`,
        [userRow.id, tokenHash, expiresAt]
      );

      // Construct frontend reset link
      const frontendUrl = process.env.FRONTEND_URL || (
        process.env.NODE_ENV === 'production'
          ? 'https://tattiproject-production-e5af.up.railway.app'
          : 'http://localhost:5173'
      );
      const resetLink = `${frontendUrl}/reset-password?token=${rawToken}&userId=${userRow.id}`;

      // Dispatch branded reset email via configured email service
      const emailResult = await sendPasswordResetEmail({
        to: userRow.email,
        resetUrl: resetLink,
        userName: userRow.full_name,
        role: userRow.role,
      });

      if (!emailResult.delivered) {
        console.error(`[auth/reset] Email delivery failed for ${userRow.email}:`, emailResult.error);
        return res.status(503).json({
          success: false,
          delivered: false,
          error: emailResult.error || 'Email service could not dispatch the reset email. Please verify mail configuration.',
        });
      }

      return res.json({
        success: true,
        delivered: true,
        message: 'Password reset email sent successfully. Please check your inbox and spam folder.',
        previewUrl: emailResult.previewUrl,
        devResetUrl: process.env.NODE_ENV !== 'production' ? emailResult.devResetUrl : undefined,
      });
    }

    // If user not found, return generic success to prevent email enumeration
    return res.json({
      success: true,
      delivered: true,
      message: 'If that email is registered, a password reset link has been dispatched.',
    });
  } catch (err: any) {
    console.error('RequestPasswordReset error:', err);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing the reset request.',
    });
  }
}

/**
 * GET /api/auth/email-status
 * Health check for email provider configuration (without leaking credentials).
 */
export async function checkEmailStatus(req: Request, res: Response) {
  try {
    const status = await verifyEmailConfiguration();
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

/**
 * GET /api/auth/verify-reset-token
 *
 * Validates the reset token and returns whether it is still valid and unexpired,
 * as well as the associated user's role for proper post-reset redirection.
 */
export async function verifyResetToken(req: Request, res: Response) {
  try {
    await ensurePasswordResetTable();
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    const userId = typeof req.query.userId === 'string' ? req.query.userId : '';

    if (!token || !userId) {
      return res.status(400).json({
        valid: false,
        error: 'Invalid password reset link. Please request a new one.',
      });
    }

    const tokenRes = await query(
      'SELECT token_hash, expires_at FROM password_reset_tokens WHERE user_id = $1',
      [userId]
    );

    if (tokenRes.rows.length === 0) {
      return res.status(400).json({
        valid: false,
        error: 'Invalid or already used password reset link. Please request a new one.',
      });
    }

    const { token_hash, expires_at } = tokenRes.rows[0];

    // Check expiry
    if (new Date() > new Date(expires_at)) {
      // Invalidate expired token
      await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
      return res.status(400).json({
        valid: false,
        error: 'This password reset link has expired. Please request a new one.',
      });
    }

    // Verify token cryptographic match
    const tokenValid = await bcrypt.compare(token, token_hash);
    if (!tokenValid) {
      return res.status(400).json({
        valid: false,
        error: 'Invalid password reset link. Please request a new one.',
      });
    }

    // Fetch user role for redirection assistance
    const profileRes = await query('SELECT role FROM profiles WHERE id = $1', [userId]);
    const role = profileRes.rows[0]?.role || 'student';

    return res.json({ valid: true, role });
  } catch (err) {
    console.error('VerifyResetToken error:', err);
    return res.status(500).json({ valid: false, error: 'Internal server error verifying token.' });
  }
}

/**
 * POST /api/auth/reset-password
 *
 * Accepts { userId, token, newPassword }.
 * Validates the token against the stored hash, checks expiry, updates password in users table,
 * and immediately deletes the token record to guarantee single use.
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    await ensurePasswordResetTable();
    const { userId, token, newPassword } = req.body;

    if (!userId || !token || !newPassword) {
      return res.status(400).json({ error: 'userId, token, and newPassword are required.' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Fetch stored token
    const tokenRes = await query(
      'SELECT token_hash, expires_at FROM password_reset_tokens WHERE user_id = $1',
      [userId]
    );
    if (tokenRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token. Please request a new link.' });
    }

    const { token_hash, expires_at } = tokenRes.rows[0];

    // Check expiry
    if (new Date() > new Date(expires_at)) {
      await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
      return res.status(400).json({ error: 'Reset token has expired. Please request a new one.' });
    }

    // Verify token
    const tokenValid = await bcrypt.compare(token, token_hash);
    if (!tokenValid) {
      return res.status(400).json({ error: 'Invalid or expired reset token. Please request a new link.' });
    }

    // Hash new password using bcrypt
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update the password in users table
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    // Single-use enforcement: Delete token immediately
    await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

    // Fetch user role for proper login redirection
    const profileRes = await query('SELECT role FROM profiles WHERE id = $1', [userId]);
    const role = profileRes.rows[0]?.role || 'student';

    console.log(`[auth/reset] Password successfully reset for user ${userId} (${role})`);

    return res.json({
      message: 'Password reset successfully. You can now sign in with your new password.',
      role,
    });
  } catch (err) {
    console.error('ResetPassword error:', err);
    return res.status(500).json({ error: 'Internal server error during password reset.' });
  }
}
