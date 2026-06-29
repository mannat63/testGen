export interface Board {
  id: string;
  name: string;
  fullName: string;
}

export const BOARDS: Board[] = [
  { id: 'CBSE', name: 'CBSE', fullName: 'Central Board of Secondary Education' },
  { id: 'GSEB', name: 'GSEB', fullName: 'Gujarat Secondary and Higher Secondary Education Board' },
  { id: 'JEE', name: 'JEE', fullName: 'Joint Entrance Examination' },
  { id: 'NEET', name: 'NEET', fullName: 'National Eligibility cum Entrance Test' },
];

export const BOARD_CLASSES: Record<string, string[]> = {
  'CBSE': ['Class 11', 'Class 12'],
  'GSEB': ['Class 11', 'Class 12'],
  'JEE': ['Class 11 + 12'],
  'NEET': ['Class 11 + 12'],
};

export const BOARD_SUBJECTS: Record<string, string[]> = {
  'CBSE': ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
  'GSEB': ['Physics', 'Chemistry', 'Mathematics', 'Biology'],
  'JEE': ['Physics', 'Chemistry', 'Mathematics'],
  'NEET': ['Physics', 'Chemistry', 'Biology'],
};

export const LANGUAGES = ['English', 'Gujarati', 'Hindi'];

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Mixed'];
