import mongoose from 'mongoose';
import coachingDbConnect from '@/lib/coachingDb';

const CoachingQuestionBankSchema = new mongoose.Schema({
  board: { type: String, required: true, index: true },
  classLevel: { type: String, index: true },
  subject: { type: String, required: true, index: true },
  chapter: { type: String, required: true, index: true },
  questionType: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  questionText: { type: String, required: true },
  options: [String],
  marks: { type: Number, default: 1 },
  source: { type: String, default: 'Coaching Material' },
  tags: [String],
}, { timestamps: true, strict: false });

CoachingQuestionBankSchema.index({ board: 1, subject: 1, chapter: 1, questionType: 1, difficulty: 1 });

export async function getCoachingQuestionBankModel(): Promise<mongoose.Model<any>> {
  const conn = await coachingDbConnect();
  return conn.models.CoachingQuestionBank
    || conn.model('CoachingQuestionBank', CoachingQuestionBankSchema, 'coaching_questionbank');
}
