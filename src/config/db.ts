import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let memServer: any = null;

export const connectDB = async (): Promise<typeof mongoose> => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose;
  }

  const uri = process.env.MONGODB_URI || 'mongodb+srv://amlakieab23_db_user:Amlakie1221@cluster0.zrulha2.mongodb.net/traders_jornal?retryWrites=true&w=majority&appName=Cluster0';
  
  try {
    // Try connecting to provided URI with a 2-second timeout
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`Connected to MongoDB at ${uri}`);
    return mongoose;
  } catch (err: any) {
    console.warn(`Standard MongoDB connection to ${uri} failed: ${err.message}. Initializing MongoMemoryServer fallback...`);
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memServer = await MongoMemoryServer.create();
      const memUri = memServer.getUri();
      await mongoose.connect(memUri);
      console.log(`Connected to In-Memory MongoDB at ${memUri}`);
      return mongoose;
    } catch (fallbackErr: any) {
      console.error('Fatal: Could not connect to MongoDB or in-memory server:', fallbackErr.message);
      throw fallbackErr;
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  if (memServer) {
    await memServer.stop();
  }
};
