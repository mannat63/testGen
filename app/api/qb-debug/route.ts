import { NextResponse } from 'next/server';
import { getQuestionBankModel } from '@/models/QuestionBank';

// Diagnostic endpoint — shows first 3 raw documents from question_bank
// Hit GET /api/qb-debug to see what field names your DB uses
// DELETE THIS FILE once you've verified the field structure
export async function GET() {
  try {
    const QBModel = await getQuestionBankModel();
    const total = await QBModel.countDocuments();
    const samples = await QBModel.find({}).limit(3).lean();
    return NextResponse.json({ total, samples });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
