import type { AdminAuditLogRecord, ApplicationAccessStatus } from '../models/index.js';

// In-memory / cache fallback for fast access & audit trail
const accessCache = new Map<string, { status: ApplicationAccessStatus; unlockedBy?: string; unlockedAt?: string }>();
const auditLogs: AdminAuditLogRecord[] = [];

export function getStudentApplicationAccess(studentId: string): {
  status: ApplicationAccessStatus;
  unlockedBy?: string | null;
  unlockedAt?: string | null;
} {
  const cached = accessCache.get(studentId);
  if (cached) {
    return {
      status: cached.status,
      unlockedBy: cached.unlockedBy || null,
      unlockedAt: cached.unlockedAt || null,
    };
  }
  // Default is always locked
  return { status: 'locked', unlockedBy: null, unlockedAt: null };
}

export function isStudentApplicationUnlocked(studentId: string): boolean {
  return getStudentApplicationAccess(studentId).status === 'unlocked';
}

export function setStudentApplicationAccess(
  studentId: string,
  status: ApplicationAccessStatus,
  admin: { adminId: string; adminName: string }
): { record: { status: ApplicationAccessStatus; unlockedBy?: string; unlockedAt?: string }; log: AdminAuditLogRecord } {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const record = {
    status,
    unlockedBy: status === 'unlocked' ? admin.adminName : undefined,
    unlockedAt: status === 'unlocked' ? `${dateStr}, ${timeStr}` : undefined,
  };

  accessCache.set(studentId, record);

  const log: AdminAuditLogRecord = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    student_id: studentId,
    admin_id: admin.adminId,
    admin_name: admin.adminName,
    action: status === 'unlocked' ? 'UNLOCK' : 'LOCK',
    date: dateStr,
    time: timeStr,
    created_at: now.toISOString(),
  };

  auditLogs.unshift(log);

  return { record, log };
}

export function getAuditLogsForStudent(studentId?: string): AdminAuditLogRecord[] {
  if (!studentId) return auditLogs;
  return auditLogs.filter(l => l.student_id === studentId);
}
