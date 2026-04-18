import dotenv from 'dotenv';
dotenv.config();

import app from './src/app.js';
import { testConnection, runMigrationsOnStartup } from './src/db/connection.js';

const PORT = process.env.PORT || 5000;

async function start() {
  // Test database connection
  const dbReady = await testConnection();

  if (dbReady) {
    // Auto-run any pending migrations
    await runMigrationsOnStartup();
  } else {
    console.warn('Warning: Database not available. Server will start but DB operations will fail.');
    console.warn('Set DATABASE_URL environment variable to connect.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LeadFlow AI server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
