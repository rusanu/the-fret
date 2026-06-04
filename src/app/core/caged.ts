import { fretForPitchClass, NOTE_NAMES_SHARP } from './pitch';

export interface VoicingPosition {
  string: number;  // 1–6
  fret: number;
  tone: string;    // '1', '3', '5', 'b3', etc.
}

export interface Voicing {
  shape: string;        // 'E', 'A', 'D'
  quality: 'major' | 'minor';
  rootFret: number;
  rootString: number;
  label: string;        // e.g. "Am  (E-shape)"
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
// D shape verified against open D and Dm chords.
// C and G shapes omitted: their negative-offset fingers make them impractical
// as movable barre shapes and they are rarely played that way.
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
];

// Return the voicing whose root fret is closest to targetFret.
// Considers the lowest occurrence of the root on each shape's primary string,
// plus the octave above it, so both open-position and higher-neck shapes compete.
export function findBestShape(
  rootPc: number,
  quality: 'major' | 'minor',
  targetFret: number,
  tuning: readonly string[],
): Voicing | null {
  const templates = SHAPE_TEMPLATES.filter(t => t.quality === quality);
  let best: Voicing | null = null;
  let bestDist = Infinity;

  for (const tmpl of templates) {
    const base = fretForPitchClass(rootPc, tmpl.rootString, tuning);

    for (const rootFret of [base, base + 12]) {
      const positions: VoicingPosition[] = tmpl.fingers.map(f => ({
        string: f.string,
        fret: rootFret + f.offset,
        tone: f.tone,
      }));

      // Skip if any fret is out of range
      if (positions.some(p => p.fret < 0 || p.fret > 24)) continue;

      const dist = Math.abs(rootFret - targetFret);
      if (dist < bestDist) {
        bestDist = dist;
        const rootName  = NOTE_NAMES_SHARP[rootPc];
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
  }

  return best;
}
