import { initializeDatabase, seedDefaultData, sqlite } from './index';

initializeDatabase(sqlite);
seedDefaultData();

const taskCount = sqlite.query('SELECT COUNT(*) as count FROM task_definitions').get() as {
  count: number;
};
console.log(`[OdyStorm DB] Initialized & seeded (${taskCount.count} mission definitions ready).`);
