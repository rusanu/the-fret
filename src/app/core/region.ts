import { fretForPitchClass } from './pitch';
import { PitchSetDef } from './pitch-set';

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
// 24 frets has actually 25 positions, counting the open strings (nut)
// so frets 0 and 12 and 24 need special casing because start = 0 should translate to hi 11 not 12
function withHigh(r: Region): Region[] {
  const hi: Region = {
    ...r,
    id: r.id + 'h',
    name: r.name + ' ↑',
    startFret: r.startFret == 12 ? 24 : (r.startFret + 12) % 24,
    endFret:  r.endFret == 12 ? 24 :  (r.endFret   + 12) % 24,
  };
  const results: Region[] = [];
  if (r.startFret >= 0 && r.endFret <= 24 && r.startFret <= r.endFret) results.push(r);
  if (hi.startFret >= 0 && hi.endFret <= 24 && hi.startFret <= hi.endFret) results.push(hi);

  //if (r.endFret - r.startFret > 5) console.log(r.name, r);
  //if (hi.endFret - hi.startFret > 5) console.log(r.name, hi, r);
  //if (results.length < 2) console.log(r , hi, results);
  
  return results;
}

function minorPentatonic(R:number):Region[] {
return [
      { id: 'pent1', shortLabel: '1', name: 'Box 1', group: 'pentatonic', startFret: R,     endFret: R + 3  },
      { id: 'pent2', shortLabel: '2', name: 'Box 2', group: 'pentatonic', startFret: R + 2, endFret: R + 5  },
      { id: 'pent3', shortLabel: '3', name: 'Box 3', group: 'pentatonic', startFret: R + 4, endFret: R + 8  },
      { id: 'pent4', shortLabel: '4', name: 'Box 4', group: 'pentatonic', startFret: R + 7, endFret: R + 10 },
      { id: 'pent5', shortLabel: '5', name: 'Box 5', group: 'pentatonic', startFret: R + 9, endFret: R + 12 },
    ];  
}

function majorPentatonic(R:number): Region[] {
  return [
      { id: 'pent1', shortLabel: '1', name: 'Box 1', group: 'pentatonic', startFret: R - 1, endFret: R + 2  },
      { id: 'pent2', shortLabel: '2', name: 'Box 2', group: 'pentatonic', startFret: R + 1, endFret: R + 5  },
      { id: 'pent3', shortLabel: '3', name: 'Box 3', group: 'pentatonic', startFret: R + 4, endFret: R + 7  },
      { id: 'pent4', shortLabel: '4', name: 'Box 4', group: 'pentatonic', startFret: R + 6, endFret: R + 9 },
      { id: 'pent5', shortLabel: '5', name: 'Box 5', group: 'pentatonic', startFret: R + 9, endFret: R + 12 },
    ];  
}

// Compute all named regions for a given root.
// Both low and high-octave (+12 frets) variants are included where they fit (0–24).
export function computeRegions(rootPc: number, setDef: PitchSetDef, tuning: readonly string[]): Region[] {
  const R = fretForPitchClass(rootPc, 6, tuning); // root fret on string 6

  if (setDef.name == 'BB King') {
    const base: Region[] = [
      { id: 'bbk', shortLabel: 'Box', name: 'Box', group: 'pentatonic', startFret: R+5,     endFret: R + 9  },
    ];
    return base.flatMap(withHigh);
  }
  else if (setDef.name == 'Alfred King') {
    const base: Region[] = [
      { id: 'pent2', shortLabel: 'Box', name: 'Box', group: 'pentatonic', startFret: R + 3, endFret: R + 5  },
    ];
    return base.flatMap(withHigh);
  }
  else if (setDef.name == 'Minor blues') return minorPentatonic(R).flatMap(withHigh);
  else if (setDef.name == 'Major blues') return majorPentatonic(R).flatMap(withHigh);
  else if (setDef.name == 'Minor pentatonic') {
    const base: Region[] = minorPentatonic(R);
    const caged: Region[] = [
      { id: 'caged-a', shortLabel: 'A', name: 'A shape', group: 'caged', startFret: R,      endFret: R      },
      { id: 'caged-g', shortLabel: 'G', name: 'G shape', group: 'caged', startFret: R + 2,  endFret: R + 3  },
      { id: 'caged-e', shortLabel: 'E', name: 'E shape', group: 'caged', startFret: R + 4,  endFret: R + 5  },
      { id: 'caged-d', shortLabel: 'D', name: 'D shape', group: 'caged', startFret: R + 7,  endFret: R + 8  },
      { id: 'caged-c', shortLabel: 'C', name: 'C shape', group: 'caged', startFret: R + 8,  endFret: R + 10  },
    ];
    return [...base.flatMap(withHigh), ...caged.flatMap(withHigh)];
  }  
  else if (setDef.name == 'Major pentatonic') {
    const base: Region[] = majorPentatonic(R);
    const caged: Region[] = [
      { id: 'caged-g', shortLabel: 'G', name: 'G shape', group: 'caged', startFret: R - 1,  endFret: R  },
      { id: 'caged-e', shortLabel: 'E', name: 'E shape', group: 'caged', startFret: R + 1,  endFret: R + 2  },
      { id: 'caged-d', shortLabel: 'D', name: 'D shape', group: 'caged', startFret: R + 4,  endFret: R + 5  },
      { id: 'caged-c', shortLabel: 'C', name: 'C shape', group: 'caged', startFret: R + 5,  endFret: R + 7  },
      { id: 'caged-a', shortLabel: 'A', name: 'A shape', group: 'caged', startFret: R + 9,  endFret: R + 9 },
    ];
    return [...base.flatMap(withHigh), ...caged.flatMap(withHigh)];
  }
  else if (setDef.category == 'scale' && setDef.intervals.length == 7) {
    const base: Region[] = [
      { id: 'caged-e', shortLabel: 'E', name: 'E shape', group: 'caged', startFret: R,                  endFret: R + 3  },
      { id: 'caged-d', shortLabel: 'D', name: 'D shape', group: 'caged', startFret: R + 2,              endFret: R + 5  },
      { id: 'caged-c', shortLabel: 'C', name: 'C shape', group: 'caged', startFret: R + 4,              endFret: R + 8  },
      { id: 'caged-a', shortLabel: 'A', name: 'A shape', group: 'caged', startFret: R + 7,              endFret: R + 10 },
      { id: 'caged-g', shortLabel: 'G', name: 'G shape', group: 'caged', startFret: R + 9,              endFret: R + 12 },
    ];
    return base.flatMap(withHigh); 
  }

  return [];
}
