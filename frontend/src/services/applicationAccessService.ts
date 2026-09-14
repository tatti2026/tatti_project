import type { AdminAuditLog } from '@/types/index';
import { format } from 'date-fns';

const ACCESS_KEY = 'tatti_application_access_records';
const AUDIT_LOG_KEY = 'tatti_admin_audit_logs';

export interface ApplicationAccessRecord {
  status: 'locked' | 'unlocked';
  unlocked_by?: string | null;
  unlocked_at?: string | null;
}

// Initial state: default is locked
function getStoredAccessMap(): Record<string, ApplicationAccessRecord> {
  try {
    const raw = localStorage.getItem(ACCESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAccessMap(map: Record<string, ApplicationAccessRecord>) {
  try {
    localStorage.setItem(ACCESS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getStoredAuditLogs(): AdminAuditLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAuditLogs(logs: AdminAuditLog[]) {
  try {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
  } catch {
    // ignore
  }
}

/**
 * Get application access status for a student.
 * Default is strictly 'locked'.
 */
export function getApplicationAccess(studentId: string): ApplicationAccessRecord {
  if (!studentId) return { status: 'locked' };
  const map = getStoredAccessMap();
  return map[studentId] || { status: 'locked' };
}

/**
 * Check whether application access is unlocked for a student.
 */
export function isApplicationUnlocked(studentId: string): boolean {
  if (!studentId) return false;
  const rec = getApplicationAccess(studentId);
  return rec.status === 'unlocked';
}

/**
 * Set application access status (unlock or lock).
 * Records an audit log, updates localStorage, and broadcasts an event for real-time synchronization.
 */
export function setApplicationAccess(
  studentId: string,
  status: 'locked' | 'unlocked',
  adminInfo: { adminId: string; adminName: string },
  studentName?: string
): ApplicationAccessRecord {
  const map = getStoredAccessMap();
  const now = new Date();
  const dateStr = format(now, 'dd MMMM yyyy');
  const timeStr = format(now, 'hh:mm a');

  const newRecord: ApplicationAccessRecord = {
    status,
    unlocked_by: status === 'unlocked' ? adminInfo.adminName || 'Admin' : null,
    unlocked_at: status === 'unlocked' ? `${dateStr}, ${timeStr}` : null,
  };

  map[studentId] = newRecord;
  saveAccessMap(map);

  // Add audit trail entry
  const logs = getStoredAuditLogs();
  const newLog: AdminAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    student_id: studentId,
    student_name: studentName,
    admin_id: adminInfo.adminId || 'ADMIN',
    admin_name: adminInfo.adminName || 'TATTI Admin',
    action: status === 'unlocked' ? 'UNLOCK' : 'LOCK',
    date: dateStr,
    time: timeStr,
    created_at: now.toISOString(),
  };

  logs.unshift(newLog);
  saveAuditLogs(logs);

  // Dispatch custom event for real-time reactive UI update in the current tab
  window.dispatchEvent(
    new CustomEvent('tatti_application_access_changed', {
      detail: { studentId, status, record: newRecord, log: newLog },
    })
  );

  return newRecord;
}

/**
 * Get audit logs, optionally filtered by studentId.
 */
export function getAuditLogs(studentId?: string): AdminAuditLog[] {
  const logs = getStoredAuditLogs();
  if (!studentId) return logs;
  return logs.filter(l => l.student_id === studentId);
}
