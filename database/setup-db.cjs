const fs = require('fs');
const { execSync } = require('child_process');
const { Client } = require('../backend/node_modules/pg');

async function main() {
  const p = 'C:\\Program Files\\PostgreSQL\\14\\data\\pg_hba.conf';
  try {
    let content = fs.readFileSync(p, 'utf8');
    if (content.includes('scram-sha-256')) {
      content = content.replace(/host\s+all\s+all\s+127\.0\.0\.1\/32\s+scram-sha-256/g, 'host    all             all             127.0.0.1/32            trust');
      content = content.replace(/host\s+all\s+all\s+::1\/128\s+scram-sha-256/g, 'host    all             all             ::1/128                 trust');
      fs.writeFileSync(p, content, 'utf8');
      console.log('Updated pg_hba.conf to trust localhost');
      try {
        const out = execSync('"C:\\Program Files\\PostgreSQL\\14\\bin\\pg_ctl.exe" reload -D "C:\\Program Files\\PostgreSQL\\14\\data"');
        console.log('Reload output:', out.toString());
      } catch (err) {
        console.log('Reload failed, continuing:', err.message);
      }
    }
  } catch (err) {
    console.log('Could not update pg_hba.conf directly:', err.message);
  }

  // Connect to postgres server
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    database: 'postgres'
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully as postgres user!');
    
    // Set password for postgres user to 'postgres'
    await client.query("ALTER USER postgres WITH PASSWORD 'postgres';");
    console.log("Postgres user password set to 'postgres'");

    // Check if tatti_portal database exists
    const dbCheck = await client.query("SELECT 1 FROM pg_database WHERE datname = 'tatti_portal'");
    if (dbCheck.rows.length === 0) {
      await client.query("CREATE DATABASE tatti_portal;");
      console.log("Database 'tatti_portal' created!");
    } else {
      console.log("Database 'tatti_portal' already exists.");
    }
    await client.end();

    // Now connect to tatti_portal database and apply full_schema.sql
    const tattiClient = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'tatti_portal'
    });
    await tattiClient.connect();
    console.log("Connected to 'tatti_portal' database!");

    const schemaPath = __dirname + '/schema/full_schema.sql';
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await tattiClient.query(schemaSql);
    console.log('Applied full_schema.sql to tatti_portal successfully!');

    // Verify tables
    const tablesRes = await tattiClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Created tables in tatti_portal:');
    tablesRes.rows.forEach(r => console.log('  -', r.table_name));

    await tattiClient.end();
    console.log('Database setup completed successfully!');
  } catch (err) {
    console.error('Setup error:', err);
    process.exit(1);
  }
}

main();
