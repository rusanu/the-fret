import { NOTE_NAMES_COMMON } from './pitch';

export interface DiatonicChord {
  chordRootPc: number;
  intervals: readonly number[];   // triad formula relative to chord root e.g. [0,3,7]
  name: string;                   // absolute name e.g. "Am"
  numeral: string;                // Roman numeral e.g. "i", "III", "ii°"
  pitchClasses: Set<number>;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

// Return the interval (semitones above scale root) for scale degree `degree`,
// wrapping correctly into the next octave when degree >= intervals.length.
export function diatonicInterval(intervals: readonly number[], degree: number): number {
  const n = intervals.length;
  return intervals[((degree % n) + n) % n] + Math.floor(degree / n) * 12;
}

export type TriadQuality = 'maj' | 'min' | 'dim' | 'aug';

export function triadQuality(third: number, fifth: number): TriadQuality {
  if (third === 4 && fifth === 8) return 'aug';
  if (third === 4 && fifth === 7) return 'maj';
  if (third === 3 && fifth === 7) return 'min';
  return 'dim'; // m3 + d5
}

// Compute the any diatonic triads for a scale.  Only meaningful for scales
// with ≥ 5 notes; caller should filter (
export function getDiatonicTriads(
  scaleRootPc: number,
  scaleIntervals: readonly number[],
): DiatonicChord[] {
  const n = scaleIntervals.length;
  if (n < 3) return [];

  return Array.from({ length: n }, (_, i) => {
    const rootInt  = diatonicInterval(scaleIntervals, i);
    const thirdInt = diatonicInterval(scaleIntervals, i + 2) - rootInt;
    const fifthInt = diatonicInterval(scaleIntervals, i + 4) - rootInt;

    const quality  = triadQuality(thirdInt, fifthInt);
    const chordRootPc = (scaleRootPc + rootInt) % 12;
    const rootName = NOTE_NAMES_COMMON[chordRootPc];

    const qualSuffix    = quality === 'min' ? 'm' : quality === 'dim' ? '°' : quality === 'aug' ? '+' : '';
    const numeralBase   = ROMAN[i % n] ?? String(i + 1);
    const numeralSuffix = quality === 'dim' ? '°' : quality === 'aug' ? '+' : '';
    const numeral       = (quality === 'maj' || quality === 'aug')
      ? `${numeralBase}${numeralSuffix}`
      : `${numeralBase.toLowerCase()}${numeralSuffix}`;

    const intervals: readonly number[] = [0, thirdInt, fifthInt];
    const pitchClasses = new Set(intervals.map(iv => (chordRootPc + iv) % 12));

    return { chordRootPc, intervals, name: `${rootName}${qualSuffix}`, numeral, pitchClasses };
  });
}
