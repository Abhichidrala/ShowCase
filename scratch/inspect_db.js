const { dbGet, dbAll } = require('../server/config/db');

async function checkUsers() {
  const users = await dbAll('SELECT id, username, email, is_verified, verification_token FROM users');
  console.log('Users in DB:');
  console.log(users);
}

checkUsers().catch(console.error);
