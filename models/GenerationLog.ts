import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';

const GenerationLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  userEmail: { type: String, required: true },
  board: { type: String, required: true },
  classLevel: { type: String },
  subject: { type: String, required: true },
  chapters: [{
    chapterId: String,
    chapterName: String,
  }],
  totalMarks: { type: Number },
  totalQuestions: { type: Number },
  numSets: { type: Number, default: 1 },
  tokensUsed: { type: Number, default: 0 },
  examName: { type: String },
  pattern: { type: String },
  difficulty: {
    easy: Number,
    medium: Number,
    hard: Number,
  },
  generatedAt: { type: Date, default: Date.now },
});

GenerationLogSchema.index({ generatedAt: -1 });
GenerationLogSchema.index({ userEmail: 1, generatedAt: -1 });

export async function getGenerationLogModel(): Promise<mongoose.Model<any>> {
  await dbConnect();
  if (mongoose.models.GenerationLog) {
    delete (mongoose.models as any).GenerationLog;
  }
  if (mongoose.connection.models.GenerationLog) {
    delete (mongoose.connection.models as any).GenerationLog;
  }
  return mongoose.model('GenerationLog', GenerationLogSchema, 'generationlogs_testgen');
}
