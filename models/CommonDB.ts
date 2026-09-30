import mongoose, { Connection } from 'mongoose';
import { commonDbConnect } from '@/lib/commonDbConnect';

const CommonDBSchema = new mongoose.Schema({}, {
  timestamps: false,
  strict: false,
});

export async function getCommonDBModel(collectionName: string = 'question_bank'): Promise<mongoose.Model<any>> {
  const conn: Connection = await commonDbConnect();
  
  if (conn.models.CommonDB) {
    delete (conn.models as any).CommonDB;
  }
  
  return conn.model('CommonDB', CommonDBSchema, collectionName);
}
