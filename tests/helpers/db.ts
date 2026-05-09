import db from '../../src/database/db';

export const clearTables = async () => {
  const tables = ['webhooks', 'ledger_entries', 'transactions', 'wallets', 'blacklist_checks', 'users'];
  await db.raw('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of tables) {
    await db(table).truncate();
  }
  await db.raw('SET FOREIGN_KEY_CHECKS = 1');
};
