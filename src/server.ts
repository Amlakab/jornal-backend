import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { seedDatabase } from './seed.js';
import { User } from './models/User.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    // Check if system has admin, if not auto-seed
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount === 0) {
      console.log('No administrator detected. Running initial system seeder...');
      await seedDatabase();
    }

    const app = createApp();

    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 Trading Journal Backend running on port ${PORT}`);
      console.log(`📡 Base API URL: http://localhost:${PORT}/api`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
    });

    // Graceful Shutdown
    const shutdown = () => {
      console.log('Received kill signal, shutting down gracefully...');
      server.close(() => {
        console.log('Closed out remaining connections');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
