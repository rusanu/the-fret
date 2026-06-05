import { fretForPitchClass } from './pitch';

export interface Region {
  id: string;
  name: string;
  shortLabel: string; // single-character label for band display: '1'–'5', 'E'/'A'/'D'/'C'/'G'
  startFret: number;
  endFret: number;
  group: 'pentatonic' | 'caged' | 'blues';
}

// Helper: create both the low and +12 (high) variant of a region, keeping only
// those whose fret range fits entirely within the 24-fret neck.
function withHigh(r: Region): Region[] {
  const hi: Region = {
    ...r,
    id: r.id + 'h',
    name: r.name + ' ↑',
    startFret: r.startFret + 12,
    endFret:   r.endFret   + 12,
  };
  const results: Region[] = [];
  if (r.startFret >= 0 && r.endFret <= 24) results.push(r);
  if (hi.startFret >= 0 && hi.endFret <= 24) results.push(hi);
  return results;
}

// Compute all named regions for a given root.
// Both low and high-octave (+12 frets) variants are included where they fit (0–24).
// Blues boxes are kept in the data but hidden from the UI (per TODO).
export function computeRegions(rootPc: number, tuning: readonly string[]): Region[] {
  const R = fretForPitchClass(rootPc, 6, tuning); // root fret on string 6

  const pentatonicBase: Region[] = [
    { id: 'pent1', shortLabel: '1', name: 'Box 1', group: 'pentatonic', startFret: R,                  endFret: R + 3  },
    { id: 'pent2', shortLabel: '2', name: 'Box 2', group: 'pentatonic', startFret: R + 2,              endFret: R + 5  },
    { id: 'pent3', shortLabel: '3', name: 'Box 3', group: 'pentatonic', startFret: R + 4,              endFret: R + 8  },
    { id: 'pent4', shortLabel: '4', name: 'Box 4', group: 'pentatonic', startFret: R + 7,              endFret: R + 10 },
    { id: 'pent5', shortLabel: '5', name: 'Box 5', group: 'pentatonic', startFret: Math.max(0, R - 3), endFret: R      },
  ];

  const cagedBase: Region[] = [
    { id: 'caged-e', shortLabel: 'E', name: 'E shape', group: 'caged', startFret: Math.max(0, R - 1), endFret: R + 3  },
    { id: 'caged-d', shortLabel: 'D', name: 'D shape', group: 'caged', startFret: R + 2,              endFret: R + 5  },
    { id: 'caged-c', shortLabel: 'C', name: 'C shape', group: 'caged', startFret: R + 4,              endFret: R + 8  },
    { id: 'caged-a', shortLabel: 'A', name: 'A shape', group: 'caged', startFret: R + 7,              endFret: R + 11 },
    { id: 'caged-g', shortLabel: 'G', name: 'G shape', group: 'caged', startFret: R + 10,             endFret: R + 14 },
  ];

  const blues: Region[] = [
    { id: 'bb-box', shortLabel: 'BB', name: 'BB King box',     group: 'blues', startFret: R + 3, endFret: R + 8 },
    { id: 'ak-box', shortLabel: 'AK', name: 'Albert King box', group: 'blues', startFret: R + 2, endFret: R + 6 },
  ];

  const pentatonic = pentatonicBase.flatMap(withHigh);
  const caged      = cagedBase.flatMap(withHigh);

  return [...pentatonic, ...caged, ...blues];
}
