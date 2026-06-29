import { NextResponse } from 'next/server';
import { getGenerationLogModel } from '@/models/GenerationLog';
import { getTemplateModel } from '@/models/Template';
import { getSavedConfigModel } from '@/models/SavedConfig';
import { getAllowedUserModel } from '@/models/AllowedUser';

export async function POST() {
  try {
    const GenerationLog = await getGenerationLogModel();
    const Template = await getTemplateModel();
    const SavedConfig = await getSavedConfigModel();
    const AllowedUser = await getAllowedUserModel();

    // Seed allowed users
    const emails = ['teamintellogy@gmail.com', 'campervictor52@gmail.com', 'rahul.physics@school.edu', 'priya.math@school.edu', 'ankit.chem@school.edu'];
    for (const email of emails) {
      await AllowedUser.findOneAndUpdate({ email }, { email, addedAt: new Date() }, { upsert: true });
    }

    // Seed templates
    const templateData = [
      { name: 'Physics Weekly Ch 1-3', type: 'weekly', board: 'CBSE', classLevel: 'Class 12', subject: 'Physics', totalMarks: 25, duration: 45, createdBy: 'teamintellogy@gmail.com', language: 'English', difficulty: { easy: 30, medium: 50, hard: 20 }, sections: [{ name: 'Section A — MCQ', questionTypes: [{ type: 'mcq', label: 'MCQ', marksEach: 1, count: 10 }] }, { name: 'Section B', questionTypes: [{ type: 'sa1', label: 'Short Answer', marksEach: 2, count: 5 }, { type: 'sa2', label: 'Descriptive', marksEach: 3, count: 1 }, { type: 'la', label: 'Long', marksEach: 2, count: 1 }] }], chapters: [{ chapterId: 'phy12-1', chapterName: 'Electric Charges and Fields', weightage: 8 }, { chapterId: 'phy12-2', chapterName: 'Electrostatic Potential and Capacitance', weightage: 8 }, { chapterId: 'phy12-3', chapterName: 'Current Electricity', weightage: 9 }] },
      { name: 'Chemistry Monthly Full Syllabus', type: 'monthly', board: 'CBSE', classLevel: 'Class 12', subject: 'Chemistry', totalMarks: 70, duration: 180, createdBy: 'teamintellogy@gmail.com', language: 'English', difficulty: { easy: 25, medium: 50, hard: 25 }, sections: [{ name: 'Section A — MCQ', questionTypes: [{ type: 'mcq', label: 'MCQ', marksEach: 1, count: 16 }] }, { name: 'Section B', questionTypes: [{ type: 'sa1', label: 'Short Answer', marksEach: 2, count: 5 }] }, { name: 'Section C', questionTypes: [{ type: 'sa2', label: 'Short Answer II', marksEach: 3, count: 7 }] }, { name: 'Section D', questionTypes: [{ type: 'la', label: 'Long Answer', marksEach: 5, count: 3 }] }], chapters: [] },
      { name: 'NEET Biology Mock', type: 'mock', board: 'NEET', classLevel: 'Class 11 + 12', subject: 'Biology', totalMarks: 360, duration: 100, createdBy: 'teamintellogy@gmail.com', language: 'English', difficulty: { easy: 20, medium: 50, hard: 30 }, sections: [{ name: 'Section A', questionTypes: [{ type: 'mcq', label: 'MCQ (4 marks)', marksEach: 4, count: 35 }] }, { name: 'Section B', questionTypes: [{ type: 'mcq', label: 'MCQ (4 marks)', marksEach: 4, count: 15 }] }], chapters: [] },
      { name: 'JEE Physics Practice', type: 'revision', board: 'JEE', classLevel: 'Class 11 + 12', subject: 'Physics', totalMarks: 100, duration: 60, createdBy: 'teamintellogy@gmail.com', language: 'English', difficulty: { easy: 15, medium: 45, hard: 40 }, sections: [{ name: 'Section A — MCQ', questionTypes: [{ type: 'mcq', label: 'MCQ (4 marks, -1)', marksEach: 4, count: 20 }] }, { name: 'Section B — Numerical', questionTypes: [{ type: 'numerical', label: 'Numerical', marksEach: 4, count: 5 }] }], chapters: [] },
      { name: 'GSEB Physics Board Pattern', type: 'mock', board: 'GSEB', classLevel: 'Class 12', subject: 'Physics', totalMarks: 100, duration: 180, createdBy: 'teamintellogy@gmail.com', language: 'English', difficulty: { easy: 30, medium: 50, hard: 20 }, sections: [{ name: 'Part A — MCQ (OMR)', questionTypes: [{ type: 'mcq', label: 'MCQ', marksEach: 1, count: 50 }] }, { name: 'Part B — Descriptive', questionTypes: [{ type: 'sa1', label: 'Short Answer I', marksEach: 2, count: 8 }, { type: 'sa2', label: 'Short Answer II', marksEach: 3, count: 6 }, { type: 'la', label: 'Long Answer', marksEach: 4, count: 4 }] }], chapters: [] },
      { name: 'Maths Revision Ch 1-6', type: 'revision', board: 'CBSE', classLevel: 'Class 12', subject: 'Mathematics', totalMarks: 80, duration: 150, createdBy: 'teamintellogy@gmail.com', language: 'English', difficulty: { easy: 20, medium: 50, hard: 30 }, sections: [{ name: 'Section A — MCQ', questionTypes: [{ type: 'mcq', label: 'MCQ', marksEach: 1, count: 20 }] }, { name: 'Section B', questionTypes: [{ type: 'sa1', label: 'VSA', marksEach: 2, count: 5 }] }, { name: 'Section C', questionTypes: [{ type: 'sa2', label: 'SA', marksEach: 3, count: 6 }] }, { name: 'Section D', questionTypes: [{ type: 'la', label: 'LA', marksEach: 5, count: 4 }] }], chapters: [{ chapterId: 'math12-1', chapterName: 'Relations and Functions', weightage: 8 }, { chapterId: 'math12-2', chapterName: 'Inverse Trigonometric Functions', weightage: 4 }, { chapterId: 'math12-3', chapterName: 'Matrices', weightage: 5 }, { chapterId: 'math12-4', chapterName: 'Determinants', weightage: 5 }, { chapterId: 'math12-5', chapterName: 'Continuity and Differentiability', weightage: 8 }, { chapterId: 'math12-6', chapterName: 'Application of Derivatives', weightage: 8 }] },
    ];
    await Template.deleteMany({});
    await Template.insertMany(templateData);

    // Seed generation logs (simulate teacher activity)
    const teachers = [
      { userId: 'user_teacher1', userEmail: 'rahul.physics@school.edu' },
      { userId: 'user_teacher2', userEmail: 'priya.math@school.edu' },
      { userId: 'user_teacher3', userEmail: 'ankit.chem@school.edu' },
      { userId: 'user_admin', userEmail: 'teamintellogy@gmail.com' },
      { userId: 'user_victor', userEmail: 'campervictor52@gmail.com' },
    ];

    const logEntries = [];
    const subjects = ['Physics', 'Chemistry', 'Mathematics', 'Biology'];
    const boards = ['CBSE', 'GSEB', 'JEE', 'NEET'];
    const examNames = ['Weekly Test 1', 'Weekly Test 2', 'Monthly Test', 'Mid Term', 'Unit Test', 'Revision Test', 'Mock Exam', 'Practice Paper', 'Pre-Board'];
    const chapterSets: Record<string, { chapterId: string; chapterName: string }[]> = {
      Physics: [
        { chapterId: 'phy12-1', chapterName: 'Electric Charges and Fields' },
        { chapterId: 'phy12-2', chapterName: 'Electrostatic Potential and Capacitance' },
        { chapterId: 'phy12-3', chapterName: 'Current Electricity' },
        { chapterId: 'phy12-4', chapterName: 'Moving Charges and Magnetism' },
        { chapterId: 'phy12-5', chapterName: 'Magnetism and Matter' },
        { chapterId: 'phy12-6', chapterName: 'Electromagnetic Induction' },
        { chapterId: 'phy12-7', chapterName: 'Alternating Current' },
        { chapterId: 'phy12-8', chapterName: 'Electromagnetic Waves' },
        { chapterId: 'phy12-9', chapterName: 'Ray Optics and Optical Instruments' },
        { chapterId: 'phy12-10', chapterName: 'Wave Optics' },
      ],
      Chemistry: [
        { chapterId: 'chem12-1', chapterName: 'The Solid State' },
        { chapterId: 'chem12-2', chapterName: 'Solutions' },
        { chapterId: 'chem12-3', chapterName: 'Electrochemistry' },
        { chapterId: 'chem12-4', chapterName: 'Chemical Kinetics' },
        { chapterId: 'chem12-5', chapterName: 'Surface Chemistry' },
        { chapterId: 'chem12-6', chapterName: 'd and f Block Elements' },
        { chapterId: 'chem12-7', chapterName: 'Coordination Compounds' },
        { chapterId: 'chem12-8', chapterName: 'Haloalkanes and Haloarenes' },
      ],
      Mathematics: [
        { chapterId: 'math12-1', chapterName: 'Relations and Functions' },
        { chapterId: 'math12-2', chapterName: 'Inverse Trigonometric Functions' },
        { chapterId: 'math12-3', chapterName: 'Matrices' },
        { chapterId: 'math12-4', chapterName: 'Determinants' },
        { chapterId: 'math12-5', chapterName: 'Continuity and Differentiability' },
        { chapterId: 'math12-6', chapterName: 'Application of Derivatives' },
        { chapterId: 'math12-7', chapterName: 'Integrals' },
      ],
      Biology: [
        { chapterId: 'bio12-1', chapterName: 'Reproduction in Organisms' },
        { chapterId: 'bio12-2', chapterName: 'Sexual Reproduction in Flowering Plants' },
        { chapterId: 'bio12-3', chapterName: 'Human Reproduction' },
        { chapterId: 'bio12-4', chapterName: 'Reproductive Health' },
        { chapterId: 'bio12-5', chapterName: 'Principles of Inheritance and Variation' },
        { chapterId: 'bio12-6', chapterName: 'Molecular Basis of Inheritance' },
      ],
    };

    const now = Date.now();
    for (let i = 0; i < 47; i++) {
      const teacher = teachers[i % teachers.length];
      const subj = subjects[i % subjects.length];
      const board = boards[Math.floor(i / 3) % boards.length];
      const chapPool = chapterSets[subj] || chapterSets['Physics'];
      const chapCount = 2 + (i % 4);
      const chapters = chapPool.slice(0, Math.min(chapCount, chapPool.length));
      const daysAgo = Math.floor(i * 1.5);
      const totalMarksOptions = [25, 50, 70, 80, 100];
      const totalMarks = totalMarksOptions[i % totalMarksOptions.length];
      const questionCounts = [15, 25, 33, 38, 50];
      const totalQuestions = questionCounts[i % questionCounts.length];

      logEntries.push({
        userId: teacher.userId,
        userEmail: teacher.userEmail,
        board,
        classLevel: board === 'JEE' || board === 'NEET' ? 'Class 11 + 12' : i % 2 === 0 ? 'Class 12' : 'Class 11',
        subject: subj,
        chapters,
        totalMarks,
        totalQuestions,
        numSets: 1 + (i % 3),
        examName: examNames[i % examNames.length],
        difficulty: {
          easy: 20 + (i % 3) * 5,
          medium: 45 + (i % 2) * 10,
          hard: 100 - (20 + (i % 3) * 5) - (45 + (i % 2) * 10),
        },
        generatedAt: new Date(now - daysAgo * 24 * 60 * 60 * 1000),
      });
    }
    await GenerationLog.deleteMany({});
    await GenerationLog.insertMany(logEntries);

    // Seed saved configs for campervictor52
    await SavedConfig.deleteMany({});
    await SavedConfig.insertMany([
      {
        userId: 'user_victor',
        userEmail: 'campervictor52@gmail.com',
        name: 'My Physics Weekly',
        config: { board: 'CBSE', class_grade: 'Class 12', subject: 'Physics', chapters: [{ chapterId: 'phy12-1', chapterName: 'Electric Charges and Fields', weightage: 8 }, { chapterId: 'phy12-2', chapterName: 'Electrostatic Potential and Capacitance', weightage: 8 }], totalMarks: 25, numSets: 1 },
        savedAt: new Date(now - 2 * 24 * 60 * 60 * 1000),
      },
      {
        userId: 'user_victor',
        userEmail: 'campervictor52@gmail.com',
        name: 'NEET Bio Full Mock',
        config: { board: 'NEET', class_grade: 'Class 11 + 12', subject: 'Biology', chapters: [], totalMarks: 360, numSets: 2 },
        savedAt: new Date(now - 5 * 24 * 60 * 60 * 1000),
      },
      {
        userId: 'user_teacher1',
        userEmail: 'rahul.physics@school.edu',
        name: 'Optics Revision GSEB',
        config: { board: 'GSEB', class_grade: 'Class 12', subject: 'Physics', chapters: [{ chapterId: 'phy12-9', chapterName: 'Ray Optics and Optical Instruments', weightage: 12 }, { chapterId: 'phy12-10', chapterName: 'Wave Optics', weightage: 10 }], totalMarks: 50, numSets: 1 },
        savedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
      },
    ]);

    return NextResponse.json({ success: true, counts: { logs: logEntries.length, templates: templateData.length, users: emails.length, configs: 3 } });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
