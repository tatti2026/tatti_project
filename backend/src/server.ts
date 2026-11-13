import { app } from './app.js';
import { config } from './config/environment.js';
import { startCounsellingReminderWorker } from './services/counsellingReminderService.js';
import { runSafeSchemaPreparation } from './database/runMigrations.js';

const PORT = process.env.PORT || 5000;

app.listen(Number(PORT), '0.0.0.0', async () => {
  console.log(`[PSY CARE Backend] Server listening on port ${PORT} (${config.nodeEnv})`);
  startCounsellingReminderWorker();

  // Safety gate: Database schema preparation is separated from normal startup.
  // In production, automatic DDL/DML execution is bypassed to protect the database.
  // Set RUN_DATABASE_MIGRATIONS=true ONLY when explicit migration execution is approved.
  if (process.env.RUN_DATABASE_MIGRATIONS === 'true') {
    console.log('[PSY CARE Backend] RUN_DATABASE_MIGRATIONS=true detected. Executing approved safe schema preparation...');
    try {
      await runSafeSchemaPreparation();
    } catch (err) {
      console.error('[PSY CARE Backend] Schema preparation failed:', err);
    }
  } else {
    console.log('[PSY CARE Backend] Production safe mode: Automatic schema DDL/DML bypassed on startup.');
  }
});
