import { commonDbConnect } from './commonDbConnect';

export interface QuestionBankStat {
  totalQuestions: number;
  bySubject: Record<string, number>;
  byBoard: Record<string, number>;
  byChapter: Record<string, number>;
}

const SYSTEM_COLLECTIONS = [
  'allowedusers_testgen',
  'generationlogs_testgen',
  'savedconfigs_testgen',
  'templates_testgen',
  'system.views',
];

export async function getQuestionBankStats(): Promise<QuestionBankStat> {
  const stats: QuestionBankStat = {
    totalQuestions: 0,
    bySubject: {},
    byBoard: {},
    byChapter: {},
  };

  try {
    const conn = await commonDbConnect();
    const db = conn.db;
    if (!db) return stats;

    const collections = await db.listCollections().toArray();
    
    for (const collInfo of collections) {
      if (SYSTEM_COLLECTIONS.includes(collInfo.name) || collInfo.name.endsWith('_testgen')) {
        continue;
      }
      
      const coll = db.collection(collInfo.name);
      const docs = await coll.find({}, { projection: { board: 1, subject: 1, chapter: 1, chapterName: 1 } }).toArray();
      
      stats.totalQuestions += docs.length;

      for (const doc of docs) {
        // Board
        const board = (doc.board || 'Unknown').toString().trim().toUpperCase();
        stats.byBoard[board] = (stats.byBoard[board] || 0) + 1;

        // Subject
        const subject = (doc.subject || 'Unknown').toString().trim();
        // Capitalize subject properly
        const formattedSubject = subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase();
        stats.bySubject[formattedSubject] = (stats.bySubject[formattedSubject] || 0) + 1;

        // Chapter
        const chapter = (doc.chapter || doc.chapterName || 'Unknown').toString().trim();
        if (chapter !== 'Unknown') {
           stats.byChapter[chapter] = (stats.byChapter[chapter] || 0) + 1;
        }
      }
    }
  } catch (error) {
    console.error('[QuestionBankStats] Error fetching stats:', error);
  }

  return stats;
}
