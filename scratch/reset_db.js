const { dbRun, dbAll } = require('../server/config/db');

async function resetDatabase() {
  console.log('🔄 Starting database reset...');

  // Disable foreign keys temporarily during mass deletes to prevent constraint order issues
  await dbRun('PRAGMA foreign_keys = OFF;');

  const tablesToClear = [
    'users',
    'profiles',
    'portfolio_settings',
    'projects',
    'skills',
    'experience',
    'education',
    'certificates',
    'achievements',
    'blogs',
    'social_links',
    'followers',
    'recommendations',
    'notifications',
    'messages',
    'analytics',
    'sessions',
    'audit_logs'
  ];

  for (const table of tablesToClear) {
    console.log(`🧹 Clearing table: ${table}`);
    await dbRun(`DELETE FROM ${table};`);
  }

  // Reset all auto-increment sequences except for themes
  console.log('🔄 Resetting auto-increment sequences (except themes)...');
  await dbRun("DELETE FROM sqlite_sequence WHERE name != 'themes';");

  // Re-enable foreign key constraints
  await dbRun('PRAGMA foreign_keys = ON;');

  // Optimize and shrink the database
  console.log('📦 Shrinking and optimizing database file...');
  await dbRun('VACUUM;');

  console.log('\n📊 Checking final table row counts:');
  const tables = await dbAll("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  for (const t of tables) {
    const cnt = await dbAll(`SELECT COUNT(*) as c FROM ${t.name}`);
    console.log(`   - ${t.name}: ${cnt[0].c} rows`);
  }

  console.log('\n✅ Database reset completed successfully!');
}

resetDatabase().catch(console.error);
