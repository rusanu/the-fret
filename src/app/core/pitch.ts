export type PitchClass = number; // 0–11

export const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOTE_NAMES_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

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

export function noteNameAt(
  stringNum: number,
  fret: number,
  tuning: readonly string[],
  useFlats = false
): string {
  const pc = noteAt(stringNum, fret, tuning);
  return useFlats ? NOTE_NAMES_FLAT[pc] : NOTE_NAMES_SHARP[pc];
}
