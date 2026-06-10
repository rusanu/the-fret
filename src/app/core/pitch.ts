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

export function noteNameAt(stringNum: number, fret: number, tuning: readonly string[], spelling: readonly string[] = NOTE_NAMES_COMMON): string {
  return spelling[noteAt(stringNum, fret, tuning)];
}

function letterOf(name: string): string {
  return name[0];
}

// Spell a single pitch class, avoiding letters already used by earlier scale
// degrees. Falls back to the common spelling when both the sharp and flat
// letters are taken (e.g. chromatic runs or extreme keys).
function spellPitchClass(pc: PitchClass, used: Set<string>, preferSharp: boolean): { name: string; isFallback: boolean } {
  const sharpName = NOTE_NAMES_SHARP[pc];
  const flatName  = NOTE_NAMES_FLAT[pc];
  if (sharpName === flatName) {
    return { name: sharpName, isFallback: used.has(letterOf(sharpName)) };
  }
  const sharpFree = !used.has(letterOf(sharpName));
  const flatFree  = !used.has(letterOf(flatName));
  if (sharpFree && flatFree) return { name: preferSharp ? sharpName : flatName, isFallback: false };
  if (flatFree) return { name: flatName, isFallback: false };
  if (sharpFree) return { name: sharpName, isFallback: false };
  return { name: NOTE_NAMES_COMMON[pc], isFallback: true };
}

// Walk a scale's pitch classes in order, assigning each one a letter name not
// yet used by an earlier degree (falling back to the common spelling on
// collision). `rootName`, when given, fixes the spelling of the root note.
function spellScale(rootPc: PitchClass, intervals: readonly number[], rootName: string | undefined, preferSharp: boolean): { spelling: Map<PitchClass, string>; fallbacks: number } {
  const used = new Set<string>();
  const spelling = new Map<PitchClass, string>();
  let fallbacks = 0;

  intervals.forEach((interval, i) => {
    const pc = (rootPc + interval) % 12;
    let name: string;
    if (i === 0 && rootName) {
      name = rootName;
    } else {
      const result = spellPitchClass(pc, used, preferSharp);
      name = result.name;
      if (result.isFallback) fallbacks++;
    }
    used.add(letterOf(name));
    spelling.set(pc, name);
  });

  return { spelling, fallbacks };
}

// Compute a pitch-class -> note name table for a scale, choosing sharp or
// flat spellings so that letter names don't repeat within the scale (e.g.
// C Locrian -> C, Db, Eb, F, Gb, Ab, Bb instead of reusing C/F/G/A as both
// natural and accidental). Pitch classes outside the scale fall back to
// NOTE_NAMES_COMMON. Both an all-flat-leaning and an all-sharp-leaning
// spelling are tried (seeding the root with `rootName` when given, e.g. an
// explicit "C#" vs "Db" choice) and whichever yields fewer fallback
// collisions across the scale wins (ties favor flat) — this is what makes
// e.g. E major resolve to E F# G# A B C# D# rather than starting from C's
// flat-leaning defaults.
export function getScaleSpelling(rootPc: PitchClass, intervals: readonly number[], rootName?: string): string[] {
  const sharpRoot = rootName ?? NOTE_NAMES_SHARP[rootPc];
  const flatRoot  = rootName ?? NOTE_NAMES_FLAT[rootPc];
  const rootIsFixed = sharpRoot === flatRoot;

  const flatResult  = spellScale(rootPc, intervals, rootIsFixed ? undefined : flatRoot, false);
  const sharpResult = spellScale(rootPc, intervals, rootIsFixed ? undefined : sharpRoot, true);
  const chosen = flatResult.fallbacks <= sharpResult.fallbacks ? flatResult.spelling : sharpResult.spelling;

  return Array.from({ length: 12 }, (_, pc) => chosen.get(pc) ?? NOTE_NAMES_COMMON[pc]);
}


