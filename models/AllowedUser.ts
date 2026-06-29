import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';

const AllowedUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

export async function getAllowedUserModel(): Promise<mongoose.Model<any>> {
  await dbConnect();
  return mongoose.models.AllowedUser || mongoose.model('AllowedUser', AllowedUserSchema, 'allowedusers_testgen');
}
