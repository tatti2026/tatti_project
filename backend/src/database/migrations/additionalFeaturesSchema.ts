import { query } from '../pgPool.js';

/**
 * Non-destructive schema preparation.
 * Creates required tables and adds missing columns using IF NOT EXISTS.
 * Safe to run on startup: NEVER modifies, updates, drops, or deletes existing records.
 */
export async function ensureAdditionalFeaturesSchema(): Promise<void> {
  console.log('[Schema] Checking additional features schema (Mood, Anonymous, Feedback)...');

  // Ensure counsellor_id column exists on students table (non-destructive)
  await query(`
    ALTER TABLE students 
    ADD COLUMN IF NOT EXISTS counsellor_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_students_counsellor_id ON students(counsellor_id);
  `);

  // 1. Student Mood Entries Table
  await query(`
    CREATE TABLE IF NOT EXISTS student_mood_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      entry_date DATE NOT NULL,
      mood VARCHAR(20) NOT NULL,
      journal_text TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      CONSTRAINT uq_student_mood_date UNIQUE (student_id, entry_date)
    );
    CREATE INDEX IF NOT EXISTS idx_student_mood_student ON student_mood_entries(student_id);
    CREATE INDEX IF NOT EXISTS idx_student_mood_date ON student_mood_entries(entry_date);
  `);

  // 2. Mood Attention Alerts Table
  await query(`
    CREATE TABLE IF NOT EXISTS mood_attention_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      counsellor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      consecutive_days INT NOT NULL,
      alert_reason TEXT NOT NULL,
      recent_moods JSONB NOT NULL DEFAULT '[]'::jsonb,
      last_checkin_date DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'Active',
      reviewed_at TIMESTAMPTZ,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_mood_alerts_counsellor ON mood_attention_alerts(counsellor_id);
    CREATE INDEX IF NOT EXISTS idx_mood_alerts_student ON mood_attention_alerts(student_id);
    CREATE INDEX IF NOT EXISTS idx_mood_alerts_status ON mood_attention_alerts(status);
  `);

  // 3. Anonymous Questions Counter Table
  await query(`
    CREATE TABLE IF NOT EXISTS anonymous_question_counters (
      id INT PRIMARY KEY,
      last_count INT NOT NULL DEFAULT 1000
    );
    INSERT INTO anonymous_question_counters (id, last_count)
    VALUES (1, 1000)
    ON CONFLICT (id) DO NOTHING;
  `);

  // 4. Anonymous Questions Table
  await query(`
    CREATE TABLE IF NOT EXISTS anonymous_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      counsellor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      reference_id VARCHAR(30) UNIQUE NOT NULL,
      question TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'Pending',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_anon_questions_counsellor ON anonymous_questions(counsellor_id);
    CREATE INDEX IF NOT EXISTS idx_anon_questions_student ON anonymous_questions(student_id);
    CREATE INDEX IF NOT EXISTS idx_anon_questions_status ON anonymous_questions(status);
  `);

  // 5. Anonymous Question Replies Table
  await query(`
    CREATE TABLE IF NOT EXISTS anonymous_question_replies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      question_id UUID NOT NULL REFERENCES anonymous_questions(id) ON DELETE CASCADE,
      sender_type VARCHAR(20) NOT NULL,
      sender_id UUID NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_anon_replies_question ON anonymous_question_replies(question_id);
  `);

  // 6. Session Feedback Table
  await query(`
    CREATE TABLE IF NOT EXISTS session_feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID UNIQUE NOT NULL REFERENCES counselling(id) ON DELETE CASCADE,
      student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      counsellor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_session_feedback_session ON session_feedback(session_id);
    CREATE INDEX IF NOT EXISTS idx_session_feedback_counsellor ON session_feedback(counsellor_id);
    CREATE INDEX IF NOT EXISTS idx_session_feedback_student ON session_feedback(student_id);

    -- Ensure extended feedback fields are present
    ALTER TABLE session_feedback
    ADD COLUMN IF NOT EXISTS followup_id UUID REFERENCES follow_ups(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS what_liked TEXT,
    ADD COLUMN IF NOT EXISTS improvement_suggestions TEXT,
    ADD COLUMN IF NOT EXISTS low_rating_reason TEXT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'submitted';

    -- 7. Ensure Counsellor Profiles & Approval Schema (Non-destructive, no default overwrite)
    ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS qualification VARCHAR(255),
    ADD COLUMN IF NOT EXISTS specialization VARCHAR(255),
    ADD COLUMN IF NOT EXISTS years_of_experience INT,
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20);

    -- 8. Ensure Anonymous Questions Category & Title
    ALTER TABLE anonymous_questions
    ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General Guidance',
    ADD COLUMN IF NOT EXISTS title VARCHAR(255);
  `);

  console.log('[Schema] Additional features schema successfully verified and created.');
}

/**
 * OPTIONAL: Data backfill function.
 * SEPARATED from automatic startup to protect existing database records.
 * NEVER run automatically on production startup.
 */
export async function runOptionalDataBackfill(): Promise<void> {
  console.log('[Schema Migration] Running optional data backfill...');

  // 1. Assign unassigned students to primary counsellor (ONLY if explicitly triggered)
  await query(`
    UPDATE students
    SET counsellor_id = (
      SELECT id FROM profiles
      WHERE email = 'counsellor@tatti.edu.in' AND role = 'counsellor'
      LIMIT 1
    ),
    updated_at = now()
    WHERE counsellor_id IS NULL;
  `);

  // 2. Set unassigned counsellor approval status to 'approved' (ONLY if explicitly triggered)
  await query(`
    UPDATE profiles
    SET approval_status = 'approved'
    WHERE role = 'counsellor' AND approval_status IS NULL;
  `);

  console.log('[Schema Migration] Data backfill completed.');
}
