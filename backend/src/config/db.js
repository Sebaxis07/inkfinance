import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isMongoConnected = false;

export async function connectDB() {
  try {
    // Set connection timeout to 2 seconds so it doesn't hang if Mongo isn't running
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    isMongoConnected = true;
    console.log('✅ Connected to MongoDB successfully.');
  } catch (error) {
    isMongoConnected = false;
    console.warn('⚠️ MongoDB not running or connection failed. Falling back to local JSON database storage.');
  }
}

export function getMongoStatus() {
  return isMongoConnected;
}
