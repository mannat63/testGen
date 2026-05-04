export const BOARDS = [
  { id: 'CBSE', name: 'CBSE', fullName: 'Central Board of Secondary Education' },
  { id: 'GSEB', name: 'GSEB', fullName: 'Gujarat Secondary and Higher Secondary Education Board' },
  { id: 'JEE', name: 'JEE', fullName: 'Joint Entrance Examination' },
  { id: 'NEET', name: 'NEET', fullName: 'National Eligibility cum Entrance Test' },
  { id: 'UPSC', name: 'UPSC', fullName: 'Union Public Service Commission' },
  { id: 'ICSE', name: 'ICSE', fullName: 'Indian Certificate of Secondary Education' },
];

export const BOARD_CLASSES: Record<string, string[]> = {
  'CBSE': ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'],
  'GSEB': ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'],
  'JEE': ['Class 11', 'Class 12'],
  'NEET': ['Class 11', 'Class 12'],
  'UPSC': ['N/A (Competitive)'],
  'ICSE': ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'],
};

export const BOARD_SUBJECTS: Record<string, string[]> = {
  'CBSE': ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Science', 'Social Science', 'History', 'Geography', 'English', 'Hindi', 'Computer Science'],
  'GSEB': ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Science', 'Social Science', 'Gujarati', 'English', 'Hindi', 'Computer Science'],
  'JEE': ['Physics', 'Chemistry', 'Mathematics'],
  'NEET': ['Physics', 'Chemistry', 'Biology'],
  'UPSC': ['History', 'Geography', 'Political Science', 'Economics', 'General Science', 'Current Affairs'],
  'ICSE': ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'History', 'Geography', 'English', 'Hindi', 'Computer Science'],
};

export const BOARD_QUESTION_TYPES: Record<string, string[]> = {
  'CBSE': ['Mixed', 'MCQ', 'Short Answer', 'Long Answer', 'Assertion-Reason', 'Case-based'],
  'GSEB': ['Mixed', 'MCQ', 'Short Answer', 'Long Answer'],
  'JEE': ['MCQ + Numerical', 'Only MCQ'],
  'NEET': ['Only MCQ'],
  'UPSC': ['MCQ (Prelims)', 'Descriptive (Mains)'],
  'ICSE': ['Mixed', 'MCQ', 'Short Answer', 'Long Answer'],
};

export const TOPICS_BY_SUBJECT: Record<string, string[]> = {
  'Physics': ['Units and Measurements', 'Kinematics', 'Laws of Motion', 'Work, Energy and Power', 'Rotational Motion', 'Gravitation', 'Thermodynamics', 'Oscillations and Waves', 'Electrostatics', 'Current Electricity', 'Magnetism', 'Electromagnetic Induction', 'Optics', 'Modern Physics', 'Semiconductors'],
  'Chemistry': ['Some Basic Concepts', 'Structure of Atom', 'Chemical Bonding', 'Thermodynamics', 'Equilibrium', 'Redox Reactions', 'Electrochemistry', 'Chemical Kinetics', 'Organic Chemistry - Basic Principles', 'Hydrocarbons', 'Alcohols, Phenols and Ethers', 'Aldehydes and Ketones', 'Coordination Compounds', 'Biomolecules'],
  'Mathematics': ['Sets, Relations and Functions', 'Trigonometric Functions', 'Complex Numbers', 'Linear Inequalities', 'Permutations and Combinations', 'Binomial Theorem', 'Sequences and Series', 'Straight Lines', 'Conic Sections', 'Calculus - Limits and Derivatives', 'Calculus - Integration', 'Vectors and 3D Geometry', 'Probability', 'Matrices and Determinants'],
  'Biology': ['The Living World', 'Biological Classification', 'Plant Kingdom', 'Animal Kingdom', 'Morphology of Flowering Plants', 'Cell: The Unit of Life', 'Biomolecules', 'Photosynthesis', 'Human Physiology - Digestion', 'Human Physiology - Circulation', 'Human Physiology - Excretion', 'Genetics and Evolution', 'Biotechnology', 'Ecology and Environment'],
  'Science': ['Chemical Reactions', 'Acids, Bases and Salts', 'Metals and Non-metals', 'Carbon Compounds', 'Life Processes', 'Control and Coordination', 'Reproduction', 'Heredity and Evolution', 'Light - Reflection and Refraction', 'Human Eye', 'Electricity', 'Magnetic Effects of Electric Current', 'Sources of Energy'],
  'Social Science': ['The French Revolution', 'Socialism in Europe and Russian Revolution', 'Nazism and the Rise of Hitler', 'India - Size and Location', 'Physical Features of India', 'Drainage', 'Climate', 'Natural Vegetation and Wildlife', 'Democratic Rights', 'Electoral Politics', 'Money and Credit', 'Globalisation and the Indian Economy'],
  'History': ['Ancient Civilizations', 'Vedic Period', 'Mauryan Empire', 'Gupta Empire', 'Medieval India', 'Mughal Empire', 'European Colonialism', 'Indian National Movement', 'Post-Independence India'],
  'Geography': ['Physical Geography Basics', 'Geomorphology', 'Climatology', 'Oceanography', 'Indian Geography', 'World Economic Geography', 'Human Geography', 'Environmental Issues'],
  'Political Science': ['Constitutional Framework', 'Federalism', 'Local Self Government', 'Citizenship', 'Indian Parliament', 'Judiciary', 'Political Parties', 'Democracy'],
  'Economics': ['Introduction to Economics', 'National Income', 'Money and Banking', 'Fiscal Policy', 'International Trade', 'Indian Economy Overview', 'Poverty and Development'],
  'General Science': ['Physics Basics', 'Chemistry Basics', 'Biology Basics', 'Environmental Science', 'Space and Technology'],
  'Current Affairs': ['National Affairs', 'International Affairs', 'Economy and Finance', 'Science and Technology', 'Sports and Awards', 'Government Schemes'],
  'English': ['Reading Comprehension', 'Writing Skills - Essays', 'Writing Skills - Letters', 'Grammar - Tenses', 'Grammar - Modals and Voice', 'Literature - Prose', 'Literature - Poetry'],
  'Hindi': ['Gadya', 'Padya', 'Vyakaran', 'Lekhan Kaushal', 'Sahitya Parichay'],
  'Gujarati': ['Gadya', 'Padya', 'Vyakaran', 'Lekhan Kaushal', 'Sahitya Parichay'],
  'Computer Science': ['Computer Fundamentals', 'Python Programming - Basics', 'Python Programming - Functions', 'Data Structures', 'Database Management (SQL)', 'Computer Networks', 'Boolean Algebra', 'Cybersecurity Basics'],
  'default': ['General Topics', 'Module 1', 'Module 2', 'Module 3', 'Module 4', 'Full Syllabus']
};

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Mixed'];
export const MARKS = [20, 50, 80, 100];
export const QUESTIONS_COUNTS = [10, 20, 30, 50];
export const LANGUAGES = ['English', 'Gujarati', 'Hindi'];
