import { fretForPitchClass } from './pitch';

export interface Region {
  id: string;
  name: string;
  startFret: number;
  endFret: number;
  group: 'pentatonic' | 'caged' | 'blues';
}

// Compute all named regions for a given root, anchored to the lowest root fret on string 6.
//
// Pentatonic boxes (AGENTS.md §7): 5 interlocking positions covering the neck. Box 3 is
// deliberately 5 frets wide to capture both notes on the B string across the G–B offset.
//
// CAGED positions (AGENTS.md §5): each shape's scale region aligned to its primary root string.
// Offsets approximate the traditional 4-5 fret scale position windows.
//
// Blues boxes (AGENTS.md §7): named fret regions relative to the root, not the pentatonic boxes.
export function computeRegions(rootPc: number, tuning: readonly string[]): Region[] {
  const R = fretForPitchClass(rootPc, 6, tuning); // root fret on string 6

  const pentatonic: Region[] = [
    { id: 'pent1', name: 'Box 1', group: 'pentatonic', startFret: R,                  endFret: R + 3  },
    { id: 'pent2', name: 'Box 2', group: 'pentatonic', startFret: R + 2,              endFret: R + 5  },
    { id: 'pent3', name: 'Box 3', group: 'pentatonic', startFret: R + 4,              endFret: R + 8  }, // wide for B-string offset
    { id: 'pent4', name: 'Box 4', group: 'pentatonic', startFret: R + 7,              endFret: R + 10 },
    { id: 'pent5', name: 'Box 5', group: 'pentatonic', startFret: Math.max(0, R - 3), endFret: R      },
  ];

  // CAGED scale positions — E and D shapes align with Box 1/2; C/A/G continue up the neck.
  const caged: Region[] = [
    { id: 'caged-e', name: 'E shape', group: 'caged', startFret: Math.max(0, R - 1), endFret: R + 3  },
    { id: 'caged-d', name: 'D shape', group: 'caged', startFret: R + 2,              endFret: R + 5  },
    { id: 'caged-c', name: 'C shape', group: 'caged', startFret: R + 4,              endFret: R + 8  },
    { id: 'caged-a', name: 'A shape', group: 'caged', startFret: R + 7,              endFret: R + 11 },
    { id: 'caged-g', name: 'G shape', group: 'caged', startFret: R + 10,             endFret: R + 14 },
  ];

  // Blues boxes — anchored relative to the root, irrespective of scale type selected.
  const blues: Region[] = [
    { id: 'bb-box', name: 'BB King box',     group: 'blues', startFret: R + 3, endFret: R + 8 },
    { id: 'ak-box', name: 'Albert King box', group: 'blues', startFret: R + 2, endFret: R + 6 },
  ];

  return [...pentatonic, ...caged, ...blues];
}
