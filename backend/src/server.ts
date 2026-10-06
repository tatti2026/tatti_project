import { app } from './app.js';
import { config } from './config/environment.js';
import { startCounsellingReminderWorker } from './services/counsellingReminderService.js';
import { ensureFollowUpNotesTable } from './controllers/followUpNotesController.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`[TATTI Backend] Server listening on port ${PORT} (${config.nodeEnv})`);
  startCounsellingReminderWorker();
  try {
    await ensureFollowUpNotesTable();
    console.log('[TATTI Backend] follow_up_notes table ready.');
  } catch (err) {
    console.error('[TATTI Backend] Failed to ensure follow_up_notes table:', err);
  }
});
