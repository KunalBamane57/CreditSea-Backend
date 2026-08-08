import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start the server
    app.listen(env.PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════╗
║         CreditSea LMS API Server                ║
╠══════════════════════════════════════════════════╣
║  🚀 Server running on port ${String(env.PORT).padEnd(21)}║
║  📦 MongoDB connected                           ║
║  🔗 API: http://localhost:${String(env.PORT).padEnd(23)}║
╚══════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
