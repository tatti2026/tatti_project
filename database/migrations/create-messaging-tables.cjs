// Migration: ensure direct_messages and notifications tables exist
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../backend/.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'tatti_portal',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.direct_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
        sender_id UUID,
        sender_name VARCHAR(255) NOT NULL,
        sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('admin', 'student')),
        message_text TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read')),
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    console.log('✓ direct_messages table ready');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id UUID NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        type VARCHAR(50) DEFAULT 'general',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    console.log('✓ notifications table ready');

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
        admin_id UUID,
        admin_name VARCHAR(255) NOT NULL,
        action VARCHAR(50) NOT NULL CHECK (action IN ('UNLOCK', 'LOCK')),
        date VARCHAR(50) NOT NULL,
        time VARCHAR(50) NOT NULL,
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
    console.log('✓ admin_audit_logs table ready');

    console.log('\n✅ All tables migrated successfully!');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
