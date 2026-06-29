import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';

const CommonDBSchema = new mongoose.Schema({}, {
  timestamps: false,
  strict: false,
});

export async function getCommonDBModel(): Promise<mongoose.Model<any>> {
  await dbConnect();
  if (mongoose.models.CommonDB) {
    delete (mongoose.models as any).CommonDB;
  }
  if (mongoose.connection.models.CommonDB) {
    delete (mongoose.connection.models as any).CommonDB;
  }
  return mongoose.model('CommonDB', CommonDBSchema, 'question_bank');
}
