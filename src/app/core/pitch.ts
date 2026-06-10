export type PitchClass = number; // 0–11

export const NOTE_NAMES_SHARP  = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_FLAT   = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
// Conventional mixed spelling: sharps for C#/F#, flats for Eb/Ab/Bb.
// Used as the default display name throughout the UI.
export const NOTE_NAMES_COMMON = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export interface RootButton { name: string; pc: PitchClass; dual: boolean; }

export const ROOT_BUTTONS: RootButton[] = [
  { name: 'C',     pc: 0,  dual: false },
  { name: 'C#/Db', pc: 1,  dual: true  },
  { name: 'D',     pc: 2,  dual: false },
  { name: 'Eb/D#', pc: 3,  dual: true  },
  { name: 'E',     pc: 4,  dual: false },
  { name: 'F',     pc: 5,  dual: false },
  { name: 'F#/Gb', pc: 6,  dual: true  },
  { name: 'G',     pc: 7,  dual: false },
  { name: 'Ab/G#', pc: 8,  dual: true  },
  { name: 'A',     pc: 9,  dual: false },
  { name: 'Bb/A#', pc: 10, dual: true  },
  { name: 'B',     pc: 11, dual: false },
];

// Circle of fifths, starting at C and proceeding clockwise (C, G, D, A, E, B, F#, Db, Ab, Eb, Bb, F).
export const CIRCLE_OF_FIFTHS_ORDER: PitchClass[] = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5];

const PITCH_OF: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4,
  F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9,
  'A#': 10, Bb: 10, B: 11
};

// stringNum: 1 = high E (index 5 in tuning), 6 = low E (index 0 in tuning).
// The G–B interval (major 3rd instead of perfect 4th) is implicit in the open-string
// pitches stored in the tuning — no fret-math special-casing needed.
export function noteAt(stringNum: number, fret: number, tuning: readonly string[]): PitchClass {
  return (PITCH_OF[tuning[6 - stringNum]] + fret) % 12;
}

// Lowest fret (0–11) on stringNum where the given pitch class sounds
export function fretForPitchClass(rootPc: number, stringNum: number, tuning: readonly string[]): number {
  return (rootPc - PITCH_OF[tuning[6 - stringNum]] + 12) % 12;
}

export function noteNameAt(stringNum: number, fret: number, tuning: readonly string[]): string {
  return NOTE_NAMES_COMMON[noteAt(stringNum, fret, tuning)];
}


