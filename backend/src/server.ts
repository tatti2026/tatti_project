import { app } from './app.js';
import { config } from './config/environment.js';
import { startCounsellingReminderWorker } from './services/counsellingReminderService.js';
import { ensureFollowUpNotesTable } from './controllers/followUpNotesController.js';
import { ensureFollowUpTimeColumn } from './controllers/followUpController.js';
import { ensureQuestionsSchema } from './controllers/questionController.js';
import { ensurePasswordResetTable } from './controllers/authController.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`[PSY CARE Backend] Server listening on port ${PORT} (${config.nodeEnv})`);
  startCounsellingReminderWorker();
  try {
    await ensureFollowUpTimeColumn();
    console.log('[PSY CARE Backend] followup_time column ready.');
  } catch (err) {
    console.error('[PSY CARE Backend] Failed to ensure follow-up reminder time column:', err);
  }
  try {
    await ensureFollowUpNotesTable();
    console.log('[PSY CARE Backend] follow_up_notes table ready.');
  } catch (err) {
    console.error('[PSY CARE Backend] Failed to ensure follow_up_notes table:', err);
  }
  try {
    await ensureQuestionsSchema();
  } catch (err) {
    console.error('[PSY CARE Backend] Failed to ensure questions schema:', err);
  }
  try {
    await ensurePasswordResetTable();
  } catch (err) {
    console.error('[PSY CARE Backend] Failed to ensure password reset table:', err);
  }
});
