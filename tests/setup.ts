import db from '../src/database/db';

const TABLES_IN_CLEANUP_ORDER = [
  'webhooks',
  'ledger_entries',
  'transactions',
  'wallets',
  'blacklist_checks',
  'users',
];

const resetDatabase = async () => {
  const clientName = db.client.config.client;
  if (clientName === 'sqlite3') {
    await db.raw('PRAGMA foreign_keys = OFF');
  } else {
    await db.raw('SET FOREIGN_KEY_CHECKS = 0');
  }

  for (const table of TABLES_IN_CLEANUP_ORDER) {
    if (clientName === 'sqlite3') {
      await db(table).del();
    } else {
      await db(table).truncate();
    }
  }

  if (clientName === 'sqlite3') {
    await db.raw('PRAGMA foreign_keys = ON');
  } else {
    await db.raw('SET FOREIGN_KEY_CHECKS = 1');
  }
};

beforeAll(async () => {
  await db.migrate.latest();
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await resetDatabase();
  await db.destroy();
});
