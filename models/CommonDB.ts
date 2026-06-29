import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';

const CommonDBSchema = new mongoose.Schema({}, {
  timestamps: false,
  strict: false,
});

export async function getCommonDBModel(): Promise<mongoose.Model<any>> {
  await dbConnect();
  return mongoose.models.CommonDB || mongoose.model('CommonDB', CommonDBSchema, 'question_bank');
}
