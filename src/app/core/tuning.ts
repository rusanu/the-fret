export type Tuning = readonly string[];

export interface TuningDef {
  name: string;
  strings: Tuning; // index 0 = string 6 (low), index 5 = string 1 (high)
}

export const TUNING_PRESETS: readonly TuningDef[] = [
  { name: 'Standard — E A D G B E',          strings: ['E',  'A',  'D',  'G',  'B',  'E' ] },
  { name: 'Drop D — D A D G B E',            strings: ['D',  'A',  'D',  'G',  'B',  'E' ] },
  { name: 'DADGAD — D A D G A D',            strings: ['D',  'A',  'D',  'G',  'A',  'D' ] },
  { name: 'Half-step down — Eb Ab Db Gb Bb Eb', strings: ['Eb', 'Ab', 'Db', 'Gb', 'Bb', 'Eb'] },
  { name: 'Whole step down — D G C F A D',   strings: ['D',  'G',  'C',  'F',  'A',  'D' ] },
];

// Index 0 = string 6 (low E), index 5 = string 1 (high E)
export const STANDARD_TUNING: Tuning = TUNING_PRESETS[0].strings;
