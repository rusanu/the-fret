export interface PitchSetDef {
  name: string;
  intervals: readonly number[];
  strings?: readonly number[];
  category: 'scale' | 'mode' | 'arpeggio';
}

export const PITCH_SET_LIBRARY: readonly PitchSetDef[] = [
  // Scales (AGENTS.md §3.1)
  { name: 'Major (Ionian)',           intervals: [0,2,4,5,7,9,11], category: 'scale' },
  { name: 'Natural minor (Aeolian)', intervals: [0,2,3,5,7,8,10], category: 'scale' },
  { name: 'Harmonic minor',   intervals: [0,2,3,5,7,8,11], category: 'scale' },
  { name: 'Melodic minor',    intervals: [0,2,3,5,7,9,11], category: 'scale' },
  { name: 'Major pentatonic', intervals: [0,2,4,7,9],       category: 'scale' },
  { name: 'Minor pentatonic', intervals: [0,3,5,7,10],      category: 'scale' },
  { name: 'Minor blues',      intervals: [0,3,5,6,7,10],    category: 'scale' },
  { name: 'Major blues',      intervals: [0,2,3,4,7,9],     category: 'scale' },
  { name: 'BB King',          intervals: [0,2,3,5,7,9],    category: 'scale', strings:[1,2,3] },
  { name: 'Alfred King',      intervals: [0,3,5,7,10],    category: 'scale', strings:[1,2,3] },
  // Modes of the major scale (in modal order; Ionian and Aeolian cross-referenced from Scales)
  { name: 'Ionian (Major)',            intervals: [0,2,4,5,7,9,11], category: 'mode' },
  { name: 'Dorian',                   intervals: [0,2,3,5,7,9,10], category: 'mode' },
  { name: 'Phrygian',                 intervals: [0,1,3,5,7,8,10], category: 'mode' },
  { name: 'Lydian',                   intervals: [0,2,4,6,7,9,11], category: 'mode' },
  { name: 'Mixolydian',               intervals: [0,2,4,5,7,9,10], category: 'mode' },
  { name: 'Aeolian (Natural minor)',   intervals: [0,2,3,5,7,8,10], category: 'mode' },
  { name: 'Locrian',                  intervals: [0,1,3,5,6,8,10], category: 'mode' },
  // Arpeggios — chord formulas (AGENTS.md §3.2/3.3), rendered as single-note shapes
  { name: 'Power (5)',        intervals: [0,7],              category: 'arpeggio' },
  { name: 'Major triad',      intervals: [0,4,7],           category: 'arpeggio' },
  { name: 'Minor triad',      intervals: [0,3,7],           category: 'arpeggio' },
  { name: 'Diminished',       intervals: [0,3,6],           category: 'arpeggio' },
  { name: 'Augmented',        intervals: [0,4,8],           category: 'arpeggio' },
  { name: 'Dom 7',            intervals: [0,4,7,10],        category: 'arpeggio' },
  { name: 'Major 7',          intervals: [0,4,7,11],        category: 'arpeggio' },
  { name: 'Minor 7',          intervals: [0,3,7,10],        category: 'arpeggio' },
  { name: 'm7b5 (half-dim)',  intervals: [0,3,6,10],        category: 'arpeggio' },
  { name: 'Dim 7',            intervals: [0,3,6,9],         category: 'arpeggio' },
  { name: 'Minor/Maj 7',      intervals: [0,3,7,11],        category: 'arpeggio' },
  { name: 'Metal (5)',        intervals: [0,7],              category: 'arpeggio', strings: [5,6] },
];

export const DEGREE_NAMES = ['1','b2','2','b3','3','4','b5','5','b6','6','b7','7'] as const;

export function degreeLabel(notePc: number, rootPc: number): string {
  return DEGREE_NAMES[(notePc - rootPc + 12) % 12];
}

export function pitchesInSet(rootPc: number, intervals: readonly number[]): Set<number> {
  return new Set(intervals.map(i => (rootPc + i) % 12));
}
