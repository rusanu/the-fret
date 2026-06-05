import { fretForPitchClass, NOTE_NAMES_COMMON } from './pitch';

// Semitone interval above chord root for each tone label
const TONE_SEMITONES: Record<string, number> = {
  '1': 0, 'b2': 1, '2': 2, 'b3': 3, '3': 4, '4': 5,
  'b5': 6, '5': 7, 'b6': 8, '6': 9, 'b7': 10, '7': 11,
};

// Find the fret on `stringNum` that sounds `targetPc`, picking the occurrence
// closest to `guideFret` (the fret the standard-tuning template would suggest).
// Returns -1 when no valid fret exists within one octave of guideFret.
// This rejects C-shape / G-shape candidates at rootFret=0 where the guide
// fret is negative: the tuning-aware search would wrap to fret 9–11 (an octave
// above the guide), producing an unplayable position far up the neck.
function tuningAwareFret(
  targetPc: number,
  stringNum: number,
  guideFret: number,
  tuning: readonly string[],
): number {
  const base = fretForPitchClass(targetPc, stringNum, tuning); // lowest fret (0–11)
  let fret = base;
  while (fret < guideFret - 5 && fret + 12 <= 24) fret += 12;
  // Reject if the result is more than 11 frets from the guide (octave-wrap artefact)
  if (Math.abs(fret - guideFret) > 11) return -1;
  return fret;
}

export interface VoicingPosition {
  string: number;  // 1–6
  fret: number;
  tone: string;
}

export interface Voicing {
  shape: string;
  rootFret: number;
  rootString: number;
  label: string;
  positions: VoicingPosition[];
  mutedStrings: number[];
}

type ShapeQuality = 'major' | 'minor' | 'power';

interface FingerOffset { string: number; offset: number; tone: string; }

interface ShapeTemplate {
  id: string;
  quality: ShapeQuality;
  rootString: number;
  fingers: FingerOffset[];
  mutedStrings: number[];
}

const SHAPE_TEMPLATES: ShapeTemplate[] = [
  // ── E / Em shape (root str 6) ───────────────────────────────────────────
  {
    id: 'E', quality: 'major', rootString: 6,
    fingers: [
      { string: 6, offset: 0, tone: '1' }, { string: 5, offset: 2, tone: '5' },
      { string: 4, offset: 2, tone: '1' }, { string: 3, offset: 1, tone: '3' },
      { string: 2, offset: 0, tone: '5' }, { string: 1, offset: 0, tone: '1' },
    ],
    mutedStrings: [],
  },
  {
    id: 'E', quality: 'minor', rootString: 6,
    fingers: [
      { string: 6, offset: 0, tone: '1'  }, { string: 5, offset: 2, tone: '5' },
      { string: 4, offset: 2, tone: '1'  }, { string: 3, offset: 0, tone: 'b3' },
      { string: 2, offset: 0, tone: '5'  }, { string: 1, offset: 0, tone: '1' },
    ],
    mutedStrings: [],
  },
  // ── A / Am shape (root str 5) ───────────────────────────────────────────
  {
    id: 'A', quality: 'major', rootString: 5,
    fingers: [
      { string: 5, offset: 0, tone: '1' }, { string: 4, offset: 2, tone: '5' },
      { string: 3, offset: 2, tone: '1' }, { string: 2, offset: 2, tone: '3' },
      { string: 1, offset: 0, tone: '5' },
    ],
    mutedStrings: [6],
  },
  {
    id: 'A', quality: 'minor', rootString: 5,
    fingers: [
      { string: 5, offset: 0, tone: '1'  }, { string: 4, offset: 2, tone: '5' },
      { string: 3, offset: 2, tone: '1'  }, { string: 2, offset: 1, tone: 'b3' },
      { string: 1, offset: 0, tone: '5'  },
    ],
    mutedStrings: [6],
  },
  // ── D / Dm shape (root str 4) ───────────────────────────────────────────
  {
    id: 'D', quality: 'major', rootString: 4,
    fingers: [
      { string: 4, offset: 0, tone: '1' }, { string: 3, offset: 2, tone: '5' },
      { string: 2, offset: 3, tone: '1' }, { string: 1, offset: 2, tone: '3' },
    ],
    mutedStrings: [6, 5],
  },
  {
    id: 'D', quality: 'minor', rootString: 4,
    fingers: [
      { string: 4, offset: 0, tone: '1'  }, { string: 3, offset: 2, tone: '5' },
      { string: 2, offset: 3, tone: '1'  }, { string: 1, offset: 1, tone: 'b3' },
    ],
    mutedStrings: [6, 5],
  },
  // ── C-shape major (root str 5, negative offsets — valid only at root ≥ 3) ─
  {
    id: 'C', quality: 'major', rootString: 5,
    fingers: [
      { string: 5, offset:  0, tone: '1' }, { string: 4, offset: -1, tone: '3' },
      { string: 3, offset: -3, tone: '5' }, { string: 2, offset: -2, tone: '1' },
      { string: 1, offset: -3, tone: '3' },
    ],
    mutedStrings: [6],
  },
  // ── G-shape major (root str 6, negative offsets — valid only at root ≥ 3) ─
  {
    id: 'G', quality: 'major', rootString: 6,
    fingers: [
      { string: 6, offset:  0, tone: '1' }, { string: 5, offset: -1, tone: '3' },
      { string: 4, offset: -3, tone: '5' }, { string: 3, offset: -3, tone: '1' },
      { string: 2, offset: -3, tone: '3' }, { string: 1, offset:  0, tone: '1' },
    ],
    mutedStrings: [],
  },
  // ── Power chord (root str 6 or str 5) ───────────────────────────────────
  {
    id: '5', quality: 'power', rootString: 6,
    fingers: [
      { string: 6, offset: 0, tone: '1' },
      { string: 5, offset: 2, tone: '5' },
      { string: 4, offset: 2, tone: '1' }, // octave doubling
    ],
    mutedStrings: [3, 2, 1],
  },
  {
    id: '5', quality: 'power', rootString: 5,
    fingers: [
      { string: 5, offset: 0, tone: '1' },
      { string: 4, offset: 2, tone: '5' },
      { string: 3, offset: 2, tone: '1' }, // octave doubling
    ],
    mutedStrings: [6, 2, 1],
  },
];

// Map a chord's interval formula to the shape family used to find its position.
// Major 3rd (interval 4) → major shapes; power chord [0,7] → power shapes; else → minor.
function deriveShapeQuality(intervals: readonly number[]): ShapeQuality {
  if (intervals.length === 2 && intervals[1] === 7) return 'power';
  if (intervals.includes(4)) return 'major';
  return 'minor';
}

function openStringCount(positions: VoicingPosition[]): number {
  return positions.filter(p => p.fret === 0).length;
}

// Return the voicing whose root fret is closest to targetFret.
// Tie-break on open-string count: more open strings wins.
export function findBestShape(
  rootPc: number,
  intervals: readonly number[],
  chordName: string,
  targetFret: number,
  tuning: readonly string[],
  shapeId?: string, // when set (and not 'auto'), restrict to that CAGED shape
): Voicing | null {
  const shapeQ = deriveShapeQuality(intervals);
  let templates = SHAPE_TEMPLATES.filter(t => t.quality === shapeQ);
  if (shapeId && shapeId !== 'auto') templates = templates.filter(t => t.id === shapeId);
  let best: Voicing | null = null;
  let bestDist = Infinity;
  let bestOpen = -1;

  for (const tmpl of templates) {
    const base = fretForPitchClass(rootPc, tmpl.rootString, tuning);

    for (const rootFret of [base, base + 12]) {
      const positions: VoicingPosition[] = tmpl.fingers.map(f => {
        const toneInterval = TONE_SEMITONES[f.tone] ?? 0;
        const targetPc    = (rootPc + toneInterval) % 12;
        const guideFret   = rootFret + f.offset; // standard-tuning guide
        const fret        = tuningAwareFret(targetPc, f.string, guideFret, tuning);
        return { string: f.string, fret, tone: f.tone };
      });

      if (positions.some(p => p.fret < 0 || p.fret > 24)) continue;

      // Reject unplayable stretches: fretted (non-open) notes must span ≤ 4 frets
      const frettedFrets = positions.filter(p => p.fret > 0).map(p => p.fret);
      if (frettedFrets.length > 1) {
        const span = Math.max(...frettedFrets) - Math.min(...frettedFrets);
        if (span > 4) continue;
      }

      // Playability checks — two cases:
      const hasOpenString = positions.some(p => p.fret === 0);
      const isBarre = !hasOpenString && tmpl.id !== '5'; // power chords have no barre

      if (isBarre) {
        // Barre chord: index finger is the barre at rootFret; only 3 remain.
        // (a) No position can fall BELOW the barre — impossible to fret behind it.
        // (b) At most 3 individual fingers ABOVE the barre.
        if (positions.some(p => p.fret > 0 && p.fret < rootFret)) continue; // (a)
        if (positions.filter(p => p.fret > rootFret).length > 3)   continue; // (b)
      } else {
        // Open chord / power chord: no barre, so all 4 fingers are free.
        if (positions.filter(p => p.fret > 0).length > 4) continue;
      }

      const dist  = Math.abs(rootFret - targetFret);
      const opens = openStringCount(positions);

      if (dist > bestDist || (dist === bestDist && opens <= bestOpen)) continue;

      bestDist = dist;
      bestOpen = opens;
      const rootName = NOTE_NAMES_COMMON[rootPc];
      best = {
        shape: tmpl.id,
        rootFret,
        rootString: tmpl.rootString,
        label: `${rootName} ${chordName}  (${tmpl.id}-shape)`,
        positions,
        mutedStrings: tmpl.mutedStrings,
      };
    }
  }

  return best;
}
