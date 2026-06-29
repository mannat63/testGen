import mongoose from 'mongoose';

let cached = (global as any).mongooseCoaching as {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
} | undefined;

if (!cached) {
  cached = (global as any).mongooseCoaching = { conn: null, promise: null };
}

async function coachingDbConnect(): Promise<mongoose.Connection> {
  const uri = process.env.COACHING_DB_URI;
  if (!uri) throw new Error('COACHING_DB_URI not configured');

  if (cached!.conn) return cached!.conn;

  if (!cached!.promise) {
    cached!.promise = mongoose
      .createConnection(uri, { bufferCommands: false })
      .asPromise();
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}

export default coachingDbConnect;
