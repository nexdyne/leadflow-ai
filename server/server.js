import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import { testConnection, runMigrationsOnStartup } from './src/db/connection.js';
import { initScheduler } from './src/utils/scheduler.js';
import { bootstrapPlatformAdmin } from './src/utils/bootstrapPlatformAdmin.js';

const PORT = process.env.PORT || 5000;

async function start() {
  // Test database connection
  const dbReady = await testConnection();

  if (dbReady) {
    // Auto-run any pending migrations
    await runMigrationsOnStartup();
    // One-shot platform admin password bootstrap (gated by BOOTSTRAP_PLATFORM_ADMIN=1)
    await bootstrapPlatformAdmin();
  } else {
    console.warn('Warning: Database not available. Server will start but DB operations will fail.');
    console.warn('Set DATABASE_URL environment variable to connect.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LeadFlow AI server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    // Start scheduled jobs (digest emails, etc.)
    initScheduler();
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
