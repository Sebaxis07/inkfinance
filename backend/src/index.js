import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, getMongoStatus } from './config/db.js';
import { seedMongoIfEmpty } from './services/dbManager.js';
import apiRoutes from './routes/api.js';
import { startCronJobs } from './cron/alertsCron.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: getMongoStatus() ? 'MongoDB' : 'Local JSON Fallback',
    timestamp: new Date()
  });
});

// Initialization
async function startServer() {
  console.log('🚀 Starting InkFinance Backend...');
  
  // Connect database
  await connectDB();
  
  // Seed MongoDB if connected and empty
  await seedMongoIfEmpty();

  // Start Cron Jobs
  startCronJobs();

  // Start server
  app.listen(PORT, () => {
    console.log(`📡 Server running in Node ES Modules mode on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });
}

startServer();
