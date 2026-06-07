import { connectDB, getMongoStatus } from './config/db.js';
import { User } from './models/User.js';
import { Transaction } from './models/Transaction.js';
import { Goal } from './models/Goal.js';
import { Alert } from './models/Alert.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data', 'db_fallback');

const FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  transactions: path.join(DATA_DIR, 'transactions.json'),
  goals: path.join(DATA_DIR, 'goals.json'),
  alerts: path.join(DATA_DIR, 'alerts.json')
};

async function clearAll() {
  console.log('🧹 Starting database clearing process...');
  
  // 1. Clear MongoDB
  await connectDB();
  if (getMongoStatus()) {
    try {
      await User.deleteMany({});
      await Transaction.deleteMany({});
      await Goal.deleteMany({});
      await Alert.deleteMany({});
      console.log('✅ MongoDB database successfully cleared.');
    } catch (error) {
      console.error('❌ Failed to clear MongoDB collections:', error);
    }
  } else {
    console.log('ℹ️ MongoDB not connected. Skipping MongoDB clear.');
  }

  // 2. Clear Fallback JSON Files
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    for (const [key, filePath] of Object.entries(FILES)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
      console.log(`✅ Fallback file "${key}" cleared.`);
    }
  } catch (error) {
    console.error('❌ Failed to clear JSON fallback files:', error);
  }

  console.log('🎉 Database is now clean and ready for real usage!');
  process.exit(0);
}

clearAll();
