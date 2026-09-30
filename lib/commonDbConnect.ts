import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Global caching for development hot-reloads
let cached = (global as any).mongooseCommon;

if (!cached) {
  cached = (global as any).mongooseCommon = { conn: null, promise: null };
}

export async function commonDbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    // Parse URI and force the database name to 'common_db'
    let uri = MONGODB_URI!;
    try {
      const parsedUrl = new URL(uri);
      // parsedUrl.pathname is usually '/databaseName'
      // We replace it with '/common_db'
      parsedUrl.pathname = '/common_db';
      uri = parsedUrl.toString();
    } catch (e) {
      console.warn('[commonDbConnect] Could not parse URI, using as-is.');
    }

    cached.promise = mongoose.createConnection(uri, opts).asPromise();
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
