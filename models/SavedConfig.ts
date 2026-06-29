import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';

const SavedConfigSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  config: { type: mongoose.Schema.Types.Mixed, required: true },
  savedAt: { type: Date, default: Date.now },
});

SavedConfigSchema.index({ userId: 1, savedAt: -1 });

export async function getSavedConfigModel(): Promise<mongoose.Model<any>> {
  await dbConnect();
  return mongoose.models.SavedConfig || mongoose.model('SavedConfig', SavedConfigSchema, 'savedconfigs_testgen');
}
