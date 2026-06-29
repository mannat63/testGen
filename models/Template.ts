import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';

const QuestionTypeSchema = new mongoose.Schema({
  type: { type: String },
  label: String,
  marksEach: Number,
  count: Number,
  negativeMarking: Number,
}, { _id: false });

const SectionSchema = new mongoose.Schema({
  name: String,
  questionTypes: [QuestionTypeSchema],
}, { _id: false });

const TemplateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['weekly', 'monthly', 'revision', 'mock', 'custom'], required: true },
  board: { type: String, required: true },
  classLevel: { type: String, required: true },
  subject: { type: String, required: true },
  chapters: [{
    chapterId: String,
    chapterName: String,
    weightage: Number,
  }],
  sections: [SectionSchema],
  difficulty: {
    easy: { type: Number, default: 30 },
    medium: { type: Number, default: 50 },
    hard: { type: Number, default: 20 },
  },
  totalMarks: { type: Number, required: true },
  duration: { type: Number, required: true },
  language: { type: String, default: 'English' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export async function getTemplateModel(): Promise<mongoose.Model<any>> {
  await dbConnect();
  return mongoose.models.Template || mongoose.model('Template', TemplateSchema, 'templates_testgen');
}
