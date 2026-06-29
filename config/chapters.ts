export interface Chapter {
  id: string;
  name: string;
  defaultMarks: number;
}

export const CHAPTER_DATA: Record<string, Record<string, Chapter[]>> = {
  physics: {
    '11': [
      { id: 'phy11-01', name: 'Physical World', defaultMarks: 2 },
      { id: 'phy11-02', name: 'Units and Measurements', defaultMarks: 4 },
      { id: 'phy11-03', name: 'Motion in a Straight Line', defaultMarks: 7 },
      { id: 'phy11-04', name: 'Motion in a Plane', defaultMarks: 7 },
      { id: 'phy11-05', name: 'Laws of Motion', defaultMarks: 9 },
      { id: 'phy11-06', name: 'Work, Energy and Power', defaultMarks: 8 },
      { id: 'phy11-07', name: 'System of Particles and Rotational Motion', defaultMarks: 10 },
      { id: 'phy11-08', name: 'Gravitation', defaultMarks: 8 },
      { id: 'phy11-09', name: 'Mechanical Properties of Solids', defaultMarks: 4 },
      { id: 'phy11-10', name: 'Mechanical Properties of Fluids', defaultMarks: 5 },
      { id: 'phy11-11', name: 'Thermal Properties of Matter', defaultMarks: 5 },
      { id: 'phy11-12', name: 'Thermodynamics', defaultMarks: 7 },
      { id: 'phy11-13', name: 'Kinetic Theory', defaultMarks: 4 },
      { id: 'phy11-14', name: 'Oscillations', defaultMarks: 10 },
      { id: 'phy11-15', name: 'Waves', defaultMarks: 10 },
    ],
    '12': [
      { id: 'phy12-01', name: 'Electric Charges and Fields', defaultMarks: 7 },
      { id: 'phy12-02', name: 'Electrostatic Potential and Capacitance', defaultMarks: 8 },
      { id: 'phy12-03', name: 'Current Electricity', defaultMarks: 9 },
      { id: 'phy12-04', name: 'Moving Charges and Magnetism', defaultMarks: 8 },
      { id: 'phy12-05', name: 'Magnetism and Matter', defaultMarks: 5 },
      { id: 'phy12-06', name: 'Electromagnetic Induction', defaultMarks: 5 },
      { id: 'phy12-07', name: 'Alternating Current', defaultMarks: 5 },
      { id: 'phy12-08', name: 'Electromagnetic Waves', defaultMarks: 2 },
      { id: 'phy12-09', name: 'Ray Optics', defaultMarks: 9 },
      { id: 'phy12-10', name: 'Wave Optics', defaultMarks: 4 },
      { id: 'phy12-11', name: 'Dual Nature of Radiation and Matter', defaultMarks: 4 },
      { id: 'phy12-12', name: 'Atoms', defaultMarks: 3 },
      { id: 'phy12-13', name: 'Nuclei', defaultMarks: 3 },
      { id: 'phy12-14', name: 'Semiconductor Electronics', defaultMarks: 7 },
      { id: 'phy12-15', name: 'Communication Systems', defaultMarks: 2 },
    ],
  },

  chemistry: {
    '11': [
      { id: 'chem11-01', name: 'Some Basic Concepts of Chemistry', defaultMarks: 8 },
      { id: 'chem11-02', name: 'Structure of Atom', defaultMarks: 7 },
      { id: 'chem11-03', name: 'Classification of Elements and Periodicity', defaultMarks: 5 },
      { id: 'chem11-04', name: 'Chemical Bonding and Molecular Structure', defaultMarks: 10 },
      { id: 'chem11-05', name: 'States of Matter', defaultMarks: 5 },
      { id: 'chem11-06', name: 'Thermodynamics', defaultMarks: 8 },
      { id: 'chem11-07', name: 'Equilibrium', defaultMarks: 8 },
      { id: 'chem11-08', name: 'Redox Reactions', defaultMarks: 5 },
      { id: 'chem11-09', name: 'Hydrogen', defaultMarks: 3 },
      { id: 'chem11-10', name: 'The s-Block Elements', defaultMarks: 4 },
      { id: 'chem11-11', name: 'The p-Block Elements', defaultMarks: 8 },
      { id: 'chem11-12', name: 'Organic Chemistry - Basic Principles', defaultMarks: 10 },
      { id: 'chem11-13', name: 'Hydrocarbons', defaultMarks: 10 },
      { id: 'chem11-14', name: 'Environmental Chemistry', defaultMarks: 3 },
    ],
    '12': [
      { id: 'chem12-01', name: 'Electrochemistry', defaultMarks: 8 },
      { id: 'chem12-02', name: 'Chemical Kinetics', defaultMarks: 8 },
      { id: 'chem12-03', name: 'Coordination Compounds', defaultMarks: 8 },
      { id: 'chem12-04', name: 'The Solid State', defaultMarks: 7 },
      { id: 'chem12-05', name: 'Solutions', defaultMarks: 7 },
      { id: 'chem12-06', name: 'The p-Block Elements', defaultMarks: 7 },
      { id: 'chem12-07', name: 'Surface Chemistry', defaultMarks: 6 },
      { id: 'chem12-08', name: 'd- and f-Block Elements', defaultMarks: 6 },
      { id: 'chem12-09', name: 'Haloalkanes and Haloarenes', defaultMarks: 6 },
      { id: 'chem12-10', name: 'Alcohols, Phenols and Ethers', defaultMarks: 6 },
      { id: 'chem12-11', name: 'Aldehydes, Ketones and Carboxylic Acids', defaultMarks: 6 },
      { id: 'chem12-12', name: 'Amines', defaultMarks: 6 },
      { id: 'chem12-13', name: 'Biomolecules', defaultMarks: 6 },
      { id: 'chem12-14', name: 'Isolation of Elements', defaultMarks: 5 },
      { id: 'chem12-15', name: 'Polymers', defaultMarks: 5 },
      { id: 'chem12-16', name: 'Chemistry in Everyday Life', defaultMarks: 3 },
    ],
  },

  mathematics: {
    '11': [
      { id: 'math11-01', name: 'Sets', defaultMarks: 4 },
      { id: 'math11-02', name: 'Relations and Functions', defaultMarks: 5 },
      { id: 'math11-03', name: 'Trigonometric Functions', defaultMarks: 10 },
      { id: 'math11-04', name: 'Principle of Mathematical Induction', defaultMarks: 3 },
      { id: 'math11-05', name: 'Complex Numbers and Quadratic Equations', defaultMarks: 8 },
      { id: 'math11-06', name: 'Linear Inequalities', defaultMarks: 4 },
      { id: 'math11-07', name: 'Permutations and Combinations', defaultMarks: 8 },
      { id: 'math11-08', name: 'Binomial Theorem', defaultMarks: 6 },
      { id: 'math11-09', name: 'Sequences and Series', defaultMarks: 8 },
      { id: 'math11-10', name: 'Straight Lines', defaultMarks: 8 },
      { id: 'math11-11', name: 'Conic Sections', defaultMarks: 8 },
      { id: 'math11-12', name: 'Introduction to Three-Dimensional Geometry', defaultMarks: 5 },
      { id: 'math11-13', name: 'Limits and Derivatives', defaultMarks: 8 },
      { id: 'math11-14', name: 'Statistics', defaultMarks: 7 },
      { id: 'math11-15', name: 'Probability', defaultMarks: 8 },
    ],
    '12': [
      { id: 'math12-01', name: 'Relations and Functions', defaultMarks: 6 },
      { id: 'math12-02', name: 'Inverse Trigonometric Functions', defaultMarks: 4 },
      { id: 'math12-03', name: 'Matrices', defaultMarks: 8 },
      { id: 'math12-04', name: 'Determinants', defaultMarks: 8 },
      { id: 'math12-05', name: 'Continuity and Differentiability', defaultMarks: 8 },
      { id: 'math12-06', name: 'Applications of Derivatives', defaultMarks: 6 },
      { id: 'math12-07', name: 'Integrals', defaultMarks: 10 },
      { id: 'math12-08', name: 'Applications of Integrals', defaultMarks: 4 },
      { id: 'math12-09', name: 'Differential Equations', defaultMarks: 6 },
      { id: 'math12-10', name: 'Vector Algebra', defaultMarks: 8 },
      { id: 'math12-11', name: 'Three Dimensional Geometry', defaultMarks: 8 },
      { id: 'math12-12', name: 'Linear Programming', defaultMarks: 5 },
      { id: 'math12-13', name: 'Probability', defaultMarks: 9 },
    ],
  },

  biology: {
    '11': [
      { id: 'bio11-01', name: 'The Living World', defaultMarks: 4 },
      { id: 'bio11-02', name: 'Biological Classification', defaultMarks: 5 },
      { id: 'bio11-03', name: 'Plant Kingdom', defaultMarks: 6 },
      { id: 'bio11-04', name: 'Animal Kingdom', defaultMarks: 6 },
      { id: 'bio11-05', name: 'Morphology of Flowering Plants', defaultMarks: 7 },
      { id: 'bio11-06', name: 'Anatomy of Flowering Plants', defaultMarks: 6 },
      { id: 'bio11-07', name: 'Structural Organisation in Animals', defaultMarks: 5 },
      { id: 'bio11-08', name: 'Cell: Structure and Function', defaultMarks: 8 },
      { id: 'bio11-09', name: 'Biomolecules', defaultMarks: 8 },
      { id: 'bio11-10', name: 'Cell Cycle and Cell Division', defaultMarks: 6 },
      { id: 'bio11-11', name: 'Transport in Plants', defaultMarks: 5 },
      { id: 'bio11-12', name: 'Mineral Nutrition', defaultMarks: 4 },
      { id: 'bio11-13', name: 'Photosynthesis in Higher Plants', defaultMarks: 7 },
      { id: 'bio11-14', name: 'Respiration in Plants', defaultMarks: 5 },
      { id: 'bio11-15', name: 'Plant Growth and Development', defaultMarks: 4 },
      { id: 'bio11-16', name: 'Digestion and Absorption', defaultMarks: 4 },
      { id: 'bio11-17', name: 'Breathing and Exchange of Gases', defaultMarks: 4 },
      { id: 'bio11-18', name: 'Body Fluids and Circulation', defaultMarks: 4 },
      { id: 'bio11-19', name: 'Excretory Products and their Elimination', defaultMarks: 3 },
      { id: 'bio11-20', name: 'Locomotion and Movement', defaultMarks: 2 },
      { id: 'bio11-21', name: 'Neural Control and Coordination', defaultMarks: 4 },
      { id: 'bio11-22', name: 'Chemical Coordination and Integration', defaultMarks: 3 },
    ],
    '12': [
      { id: 'bio12-01', name: 'Reproduction in Organisms', defaultMarks: 4 },
      { id: 'bio12-02', name: 'Sexual Reproduction in Flowering Plants', defaultMarks: 6 },
      { id: 'bio12-03', name: 'Human Reproduction', defaultMarks: 6 },
      { id: 'bio12-04', name: 'Reproductive Health', defaultMarks: 4 },
      { id: 'bio12-05', name: 'Principles of Inheritance and Variation', defaultMarks: 10 },
      { id: 'bio12-06', name: 'Molecular Basis of Inheritance', defaultMarks: 12 },
      { id: 'bio12-07', name: 'Evolution', defaultMarks: 6 },
      { id: 'bio12-08', name: 'Human Health and Disease', defaultMarks: 7 },
      { id: 'bio12-09', name: 'Strategies for Enhancement in Food Production', defaultMarks: 4 },
      { id: 'bio12-10', name: 'Microbes in Human Welfare', defaultMarks: 4 },
      { id: 'bio12-11', name: 'Biotechnology: Principles and Processes', defaultMarks: 8 },
      { id: 'bio12-12', name: 'Biotechnology and its Applications', defaultMarks: 6 },
      { id: 'bio12-13', name: 'Organisms and Populations', defaultMarks: 5 },
      { id: 'bio12-14', name: 'Ecosystem', defaultMarks: 7 },
      { id: 'bio12-15', name: 'Biodiversity and Conservation', defaultMarks: 6 },
      { id: 'bio12-16', name: 'Environmental Issues', defaultMarks: 5 },
    ],
  },
};

const SUBJECT_KEY_MAP: Record<string, string> = {
  'Physics': 'physics',
  'Chemistry': 'chemistry',
  'Mathematics': 'mathematics',
  'Biology': 'biology',
};

export function getChapters(board: string, classLevel: string, subject: string): Chapter[] {
  const subjectKey = SUBJECT_KEY_MAP[subject];
  if (!subjectKey) return [];

  const classNum = classLevel.replace(/\D/g, '');

  if (board === 'JEE') {
    const c11 = CHAPTER_DATA[subjectKey]?.['11'] || [];
    const c12 = CHAPTER_DATA[subjectKey]?.['12'] || [];
    return [...c11, ...c12];
  }

  if (board === 'NEET') {
    const c11 = CHAPTER_DATA[subjectKey]?.['11'] || [];
    const c12 = CHAPTER_DATA[subjectKey]?.['12'] || [];
    return [...c11, ...c12];
  }

  return CHAPTER_DATA[subjectKey]?.[classNum] || [];
}
