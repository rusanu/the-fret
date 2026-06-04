import { fretForPitchClass, NOTE_NAMES_COMMON } from './pitch';

export interface VoicingPosition {
  string: number;  // 1–6
  fret: number;
  tone: string;    // '1', '3', '5', 'b3', etc.
}

export interface Voicing {
  shape: string;
  quality: 'major' | 'minor';
  rootFret: number;
  rootString: number;
  label: string;
  positions: VoicingPosition[];
  mutedStrings: number[];
}

interface FingerOffset { string: number; offset: number; tone: string; }

interface ShapeTemplate {
  id: string;
  quality: 'major' | 'minor';
  rootString: number;
  fingers: FingerOffset[];
  mutedStrings: number[];
}

// E and A shape offsets verified against standard barre chord fingerings.
// D shape verified against open D/Dm chords.
// C-shape (root str5): negative offsets make it impractical as a movable barre
//   above fret 3, but the invalid-fret guard filters those out automatically,
//   so it correctly surfaces as the open C chord when root fret = 3.
// G-shape (root str6): same reasoning — only valid as the open G chord (root fret 3).
const SHAPE_TEMPLATES: ShapeTemplate[] = [
  {
    id: 'E', quality: 'major', rootString: 6,
    fingers: [
      { string: 6, offset: 0, tone: '1'  },
      { string: 5, offset: 2, tone: '5'  },
      { string: 4, offset: 2, tone: '1'  },
      { string: 3, offset: 1, tone: '3'  },
      { string: 2, offset: 0, tone: '5'  },
      { string: 1, offset: 0, tone: '1'  },
    ],
    mutedStrings: [],
  },
  {
    id: 'E', quality: 'minor', rootString: 6,
    fingers: [
      { string: 6, offset: 0, tone: '1'  },
      { string: 5, offset: 2, tone: '5'  },
      { string: 4, offset: 2, tone: '1'  },
      { string: 3, offset: 0, tone: 'b3' },
      { string: 2, offset: 0, tone: '5'  },
      { string: 1, offset: 0, tone: '1'  },
    ],
    mutedStrings: [],
  },
  {
    id: 'A', quality: 'major', rootString: 5,
    fingers: [
      { string: 5, offset: 0, tone: '1'  },
      { string: 4, offset: 2, tone: '5'  },
      { string: 3, offset: 2, tone: '1'  },
      { string: 2, offset: 2, tone: '3'  },
      { string: 1, offset: 0, tone: '5'  },
    ],
    mutedStrings: [6],
  },
  {
    id: 'A', quality: 'minor', rootString: 5,
    fingers: [
      { string: 5, offset: 0, tone: '1'  },
      { string: 4, offset: 2, tone: '5'  },
      { string: 3, offset: 2, tone: '1'  },
      { string: 2, offset: 1, tone: 'b3' },
      { string: 1, offset: 0, tone: '5'  },
    ],
    mutedStrings: [6],
  },
  {
    id: 'D', quality: 'major', rootString: 4,
    fingers: [
      { string: 4, offset: 0, tone: '1'  },
      { string: 3, offset: 2, tone: '5'  },
      { string: 2, offset: 3, tone: '1'  },
      { string: 1, offset: 2, tone: '3'  },
    ],
    mutedStrings: [6, 5],
  },
  {
    id: 'D', quality: 'minor', rootString: 4,
    fingers: [
      { string: 4, offset: 0, tone: '1'  },
      { string: 3, offset: 2, tone: '5'  },
      { string: 2, offset: 3, tone: '1'  },
      { string: 1, offset: 1, tone: 'b3' },
    ],
    mutedStrings: [6, 5],
  },
  // C-shape: valid only when root on str5 >= fret 3 (negative-offset fingers
  // would otherwise go below fret 0). Surfaces the open C chord at root fret 3.
  {
    id: 'C', quality: 'major', rootString: 5,
    fingers: [
      { string: 5, offset:  0, tone: '1' },
      { string: 4, offset: -1, tone: '3' },
      { string: 3, offset: -3, tone: '5' },
      { string: 2, offset: -2, tone: '1' },
      { string: 1, offset: -3, tone: '3' },
    ],
    mutedStrings: [6],
  },
  // G-shape: valid only when root on str6 >= fret 3. Surfaces the open G chord.
  {
    id: 'G', quality: 'major', rootString: 6,
    fingers: [
      { string: 6, offset:  0, tone: '1' },
      { string: 5, offset: -1, tone: '3' },
      { string: 4, offset: -3, tone: '5' },
      { string: 3, offset: -3, tone: '1' },
      { string: 2, offset: -3, tone: '3' },
      { string: 1, offset:  0, tone: '1' },
    ],
    mutedStrings: [],
  },
];

function openStringCount(positions: VoicingPosition[]): number {
  return positions.filter(p => p.fret === 0).length;
}

// Return the voicing whose root fret is closest to targetFret.
// Tie-break on open-string count: more open strings wins (prefers conventional
// open chord voicings over barre equivalents at the same distance).
export function findBestShape(
  rootPc: number,
  quality: 'major' | 'minor',
  targetFret: number,
  tuning: readonly string[],
): Voicing | null {
  const templates = SHAPE_TEMPLATES.filter(t => t.quality === quality);
  let best: Voicing | null = null;
  let bestDist = Infinity;
  let bestOpen = -1;

  for (const tmpl of templates) {
    const base = fretForPitchClass(rootPc, tmpl.rootString, tuning);

    for (const rootFret of [base, base + 12]) {
      const positions: VoicingPosition[] = tmpl.fingers.map(f => ({
        string: f.string,
        fret: rootFret + f.offset,
        tone: f.tone,
      }));

      if (positions.some(p => p.fret < 0 || p.fret > 24)) continue;

      const dist  = Math.abs(rootFret - targetFret);
      const opens = openStringCount(positions);

      const isBetter = dist < bestDist || (dist === bestDist && opens > bestOpen);
      if (!isBetter) continue;

      bestDist = dist;
      bestOpen = opens;
      const rootName  = NOTE_NAMES_COMMON[rootPc];
      const qualLabel = quality === 'major' ? '' : 'm';
      best = {
        shape: tmpl.id,
        quality,
        rootFret,
        rootString: tmpl.rootString,
        label: `${rootName}${qualLabel}  (${tmpl.id}-shape)`,
        positions,
        mutedStrings: tmpl.mutedStrings,
      };
    }
  }

  return best;
}
