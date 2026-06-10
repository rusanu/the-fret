import { NOTE_NAMES_COMMON } from './pitch';
import { TONE_NAMES } from './voicing';

// Scale-degree label for a semitone offset from the chord root (e.g. 6 -> "b5"),
// matching the degree notation shown on the fretboard.
function degreeLabel(semitones: number): string {
  return TONE_NAMES[((semitones % 12) + 12) % 12];
}

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

const TRIAD_SUFFIX: Record<TriadQuality, string> = { maj: '', min: 'm', dim: '°', aug: '+' };

// Chord symbol suffix for a triad + seventh, based on the triad quality and
// the seventh's interval (in semitones) above the chord root.
function seventhSuffix(quality: TriadQuality, seventh: number): string {
  switch (quality) {
    case 'maj': return seventh === 11 ? 'maj7' : seventh === 10 ? '7' : `7(${degreeLabel(seventh)})`;
    case 'min': return seventh === 10 ? 'm7' : seventh === 11 ? 'm(maj7)' : `m7(${degreeLabel(seventh)})`;
    case 'dim': return seventh === 9 ? '°7' : seventh === 10 ? 'm7♭5' : `°7(${degreeLabel(seventh)})`;
    case 'aug': return seventh === 10 ? '7♯5' : seventh === 11 ? 'maj7♯5' : `+7(${degreeLabel(seventh)})`;
  }
}

// Extend a seventh-chord suffix with a ninth: a natural 9th turns the
// trailing "7" into a "9", anything else is appended as an alteration.
function ninthSuffix(seventh: string, ninth: number): string {
  if (ninth === 14) return seventh.replace(/7(?!.*7)/, '9');
  const alt = ninth === 13 ? '♭9' : ninth === 15 ? '♯9' : degreeLabel(ninth);
  return `${seventh}(${alt})`;
}

export type ChordExtension = 'power' | 'triad' | 'seventh' | 'ninth';

// Scale degrees (relative to the chord root, in thirds) included for each extension.
const EXTENSION_DEGREES: Record<ChordExtension, readonly number[]> = {
  power:   [0, 4],
  triad:   [0, 2, 4],
  seventh: [0, 2, 4, 6],
  ninth:   [0, 2, 4, 6, 8],
};

// Compute the diatonic chords for a scale, built from stacked thirds up to
// the requested extension.  Only meaningful for scales with ≥ 3 notes;
// caller should filter.
export function getDiatonicChords(
  scaleRootPc: number,
  scaleIntervals: readonly number[],
  extension: ChordExtension = 'triad',
): DiatonicChord[] {
  const n = scaleIntervals.length;
  if (n < 3) return [];

  const degrees = EXTENSION_DEGREES[extension];

  return Array.from({ length: n }, (_, i) => {
    const rootInt = diatonicInterval(scaleIntervals, i);
    const offsets = degrees.map(d => diatonicInterval(scaleIntervals, i + d) - rootInt);

    const chordRootPc = (scaleRootPc + rootInt) % 12;
    const rootName = NOTE_NAMES_COMMON[chordRootPc];

    // Always derive the triad quality from the actual 3rd/5th, regardless of
    // extension, so the Roman numeral correctly reflects the scale degree.
    const third = diatonicInterval(scaleIntervals, i + 2) - rootInt;
    const fifth = diatonicInterval(scaleIntervals, i + 4) - rootInt;
    const quality = triadQuality(third, fifth);

    let qualSuffix: string;
    switch (extension) {
      case 'power':   qualSuffix = fifth === 7 ? '5' : fifth === 6 ? '(♭5)' : fifth === 8 ? '(♯5)' : `(${degreeLabel(fifth)})`; break;
      case 'triad':   qualSuffix = TRIAD_SUFFIX[quality]; break;
      case 'seventh': qualSuffix = seventhSuffix(quality, offsets[3]); break;
      case 'ninth':   qualSuffix = ninthSuffix(seventhSuffix(quality, offsets[3]), offsets[4]); break;
    }

    const numeralBase   = ROMAN[i % n] ?? String(i + 1);
    const numeralSuffix = quality === 'dim' ? '°' : quality === 'aug' ? '+' : '';
    const numeral       = (quality === 'maj' || quality === 'aug')
      ? `${numeralBase}${numeralSuffix}`
      : `${numeralBase.toLowerCase()}${numeralSuffix}`;

    const intervals: readonly number[] = offsets;
    const pitchClasses = new Set(intervals.map(iv => (chordRootPc + iv) % 12));

    return { chordRootPc, intervals, name: `${rootName}${qualSuffix}`, numeral, pitchClasses };
  });
}
