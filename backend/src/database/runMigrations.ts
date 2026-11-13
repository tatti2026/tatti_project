import { pool } from './pgPool.js';
import { ensureCounsellorSchema, ensurePasswordResetTable } from '../controllers/authController.js';
import { ensureAdditionalFeaturesSchema } from './migrations/additionalFeaturesSchema.js';
import { ensureFollowUpTimeColumn } from '../controllers/followUpController.js';
import { ensureFollowUpNotesTable } from '../controllers/followUpNotesController.js';
import { ensureQuestionsSchema } from '../controllers/questionController.js';

/**
 * Explicit schema preparation runner.
 * Separated from normal server startup to prevent automatic DDL/DML execution in production.
 * This should ONLY be run explicitly when approved.
 */
export async function runSafeSchemaPreparation(): Promise<void> {
  console.log('[Migration] Starting explicit safe schema preparation...');

  try {
    await ensureCounsellorSchema();
    console.log('[Migration] Counsellor schema verified.');
  } catch (err) {
    console.error('[Migration] Failed to ensure counsellor schema:', err);
    throw err;
  }

  try {
    await ensureAdditionalFeaturesSchema();
    console.log('[Migration] Additional features schema verified.');
  } catch (err) {
    console.error('[Migration] Failed to ensure additional features schema:', err);
    throw err;
  }

  try {
    await ensureFollowUpTimeColumn();
    console.log('[Migration] Followup time column verified.');
  } catch (err) {
    console.error('[Migration] Failed to ensure follow-up reminder time column:', err);
    throw err;
  }

  try {
    await ensureFollowUpNotesTable();
    console.log('[Migration] Follow-up notes table verified.');
  } catch (err) {
    console.error('[Migration] Failed to ensure follow_up_notes table:', err);
    throw err;
  }

  try {
    await ensureQuestionsSchema();
    console.log('[Migration] Questions schema verified.');
  } catch (err) {
    console.error('[Migration] Failed to ensure questions schema:', err);
    throw err;
  }

  try {
    await ensurePasswordResetTable();
    console.log('[Migration] Password reset table verified.');
  } catch (err) {
    console.error('[Migration] Failed to ensure password reset table:', err);
    throw err;
  }

  console.log('[Migration] Safe schema preparation completed successfully.');
}

// Allow standalone execution: node dist/database/runMigrations.js
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  runSafeSchemaPreparation()
    .then(async () => {
      console.log('[Migration CLI] All migrations applied safely.');
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Migration CLI] Migration failed:', err);
      await pool.end();
      process.exit(1);
    });
}

