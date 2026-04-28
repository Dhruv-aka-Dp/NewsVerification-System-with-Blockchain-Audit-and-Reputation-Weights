const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod = null;

const connectDB = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const mongoUri = process.env.MONGO_URI;
      if (mongoUri) {
        const conn = await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        });
        console.log(`MongoDB connected: ${conn.connection.host}`);

        mongoose.connection.on('error', (err) => {
          console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
          console.warn('MongoDB disconnected. Attempting reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
          console.log('MongoDB reconnected');
        });

        return;
      }
      throw new Error('MONGO_URI fallback');
    } catch (err) {
      if (attempt < retries && process.env.MONGO_URI) {
        console.warn(`MongoDB connection attempt ${attempt}/${retries} failed. Retrying in ${attempt * 2}s...`);
        await new Promise(r => setTimeout(r, attempt * 2000));
        continue;
      }
      console.log('Falling back to local in-memory MongoDB cluster...');
      mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log(`In-memory Database connected running seamlessly at: ${uri}`);
      return;
    }
  }
};

module.exports = connectDB;
