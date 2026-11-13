import { query } from '../database/pgPool.js';
import type { TokenPayload } from './jwt.js';

/**
 * Checks if the caller has permission to view or manage a specific student's data.
 * - Admin: Full access to all students.
 * - Counsellor: Access ONLY if student.counsellor_id == caller.userId.
 * - Student: Access ONLY if student.profile_id == caller.userId (or id == studentId).
 */
export async function canAccessStudent(caller: TokenPayload | undefined, studentId: string): Promise<boolean> {
  if (!caller || !studentId) return false;
  
  const role = caller.role?.toLowerCase();
  if (role === 'admin') return true;

  if (role === 'counsellor') {
    const res = await query(
      'SELECT id FROM students WHERE id = $1 AND counsellor_id = $2',
      [studentId, caller.userId]
    );
    return res.rows.length > 0;
  }

  if (role === 'student') {
    const res = await query(
      'SELECT id FROM students WHERE id = $1 AND profile_id = $2',
      [studentId, caller.userId]
    );
    return res.rows.length > 0;
  }

  return false;
}

/**
 * Resolves a student's ID from a profileId, or checks access by profileId.
 */
export async function canAccessStudentProfile(caller: TokenPayload | undefined, profileId: string): Promise<boolean> {
  if (!caller || !profileId) return false;

  const role = caller.role?.toLowerCase();
  if (role === 'admin') return true;

  if (role === 'student') {
    return caller.userId === profileId;
  }

  if (role === 'counsellor') {
    const res = await query(
      'SELECT id FROM students WHERE profile_id = $1 AND counsellor_id = $2',
      [profileId, caller.userId]
    );
    return res.rows.length > 0;
  }

  return false;
}

