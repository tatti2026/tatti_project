// notificationService.ts
// Chat messages are now persisted in the PostgreSQL direct_messages table.
// This file is kept as a stub for backwards compatibility but all DB operations
// are handled directly in notificationController.ts.

export function createSystemNotification(
  _profileId: string,
  _title: string,
  _message: string,
  _type = 'general'
): void {
  // Handled via POST /api/notifications directly
}
