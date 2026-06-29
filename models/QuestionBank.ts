import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';

const QuestionBankSchema = new mongoose.Schema({
  board: { type: String, required: true, index: true },
  classLevel: { type: String, index: true },
  subject: { type: String, required: true, index: true },
  chapter: { type: String, required: true, index: true },
  questionType: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  questionText: { type: String, required: true },
  options: [String],
  marks: { type: Number, default: 1 },
  source: { type: String, default: 'Question Bank' },
  tags: [String],
}, { timestamps: true, strict: false });

QuestionBankSchema.index({ board: 1, subject: 1, chapter: 1, questionType: 1, difficulty: 1 });

export async function getQuestionBankModel(): Promise<mongoose.Model<any>> {
  await dbConnect();
  return mongoose.models.QuestionBank || mongoose.model('QuestionBank', QuestionBankSchema, 'question_bank');
}
