import { fretForPitchClass, NOTE_NAMES_COMMON, noteAt } from './pitch';
import { pitchesInSet, PitchSetDef } from './pitch-set';
import { Region } from './region';
import { Tuning } from './tuning';

// Semitone interval above chord root for each tone label
const TONE_SEMITONES: Record<string, number> = {
  '1': 0, 'b2': 1, '2': 2, 'b3': 3, '3': 4, '4': 5,
  'b5': 6, '5': 7, 'b6': 8, '6': 9, 'b7': 10, '7': 11,
};

const TONE_NAMES: string[] = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

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

export interface VoicingCandidate {
  string: number;
  fret: number;
  pitch: number;
}

export interface VoicingPosition {
  string: number;  // 1–6
  fret: number;
  tone: string;
}

export interface Voicing {
  shape?: string | null;
  rootFret: number;
  rootString: number;
  barreFret?: number | null;
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
        // The barre sits at the *lowest fretted note* (barFret), which equals rootFret
        // for E/A/D shapes (all non-negative offsets) but is LOWER than rootFret for
        // G-shape and C-shape (negative offsets by design — fingers go down from root).
        //
        // Using barFret as the anchor:
        //   (a) No position below barFret — impossible to fret behind the barre.
        //   (b) At most 3 individual fingers ABOVE barFret (4th finger is the barre).
        //
        // For E/A/D: barFret === rootFret, so alternate-tuning artifacts that land below
        // rootFret are still rejected (same as before).
        // For G/C: barFret < rootFret, so the intentional low-fret fingers are accepted.
        const barFret   = frettedFrets.length ? Math.min(...frettedFrets) : rootFret;
        const minOffset = Math.min(...tmpl.fingers.map(f => f.offset));
        const barreBase = minOffset < 0 ? barFret : rootFret;
        if (positions.some(p => p.fret > 0 && p.fret < barreBase)) continue; // (a)
        if (positions.filter(p => p.fret > barreBase).length > 3)   continue; // (b)
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

  
export function findVoicing(chordRootPc: number, 
  intervals: readonly number[], 
  chordName: string,
  activeRegion: Region, 
  scale: PitchSetDef,
  selectedTuning: Tuning): Voicing | null {
  const chordPitches = pitchesInSet(chordRootPc, intervals);

  let voicingCandidates = new Set<VoicingCandidate>();

  for (let s=1;s<=selectedTuning.length; ++s) {
    for (let f = activeRegion.startFret;f<=activeRegion.endFret;++f)
    {
      const note = noteAt(s, f, selectedTuning);
      if (chordPitches.has(note)) {
        const vp:VoicingCandidate = {
          string: s,
          fret: f,
          pitch: note
        };
        voicingCandidates.add(vp);
      }
    }
  }

  function* candidates(
    pitches:number[], 
    found: number[],
    string: number,
    positions:VoicingCandidate[]):Iterable<VoicingCandidate[]> {

      if (string > 6) {
        return;
      }

      const cand = positions.filter(p => p.string == string);

      for(var p of cand) {
        if (!pitches.includes(p.pitch)) {
          continue;
        }

        const newFound = found.includes(p.pitch) ? found :  [p.pitch, ...found];

        const rest = candidates(pitches, newFound, string + 1, positions);

        for (const r of rest) {
          yield [p, ...r];
        }

        if (newFound.length == pitches.length) {
          yield [p];          
        }
      }

      // finally emit *if we mute this string* 
      yield* candidates(pitches, found, string + 1, positions);
    }

  function canBeVoiced(vcs:VoicingCandidate[]):boolean {
    const topS = vcs.reduce((acc, vc) => Math.min(acc, vc.string), 7);
    const bottomS = vcs.reduce((acc, vc) => Math.max(acc, vc.string), 0);

    // must be either top N strings or bottom N strings
    // allow for thumb muttin on 6
    if (topS != 1 && bottomS < 5) return false;
    if ((topS == 1) && (bottomS != vcs.length)) return false;
    if ((bottomS == 6) && (topS != 7 - vcs.length)) return false;

    // now count the required fingers/fret
    // One can barre first fret (index) up to all strings
    // One can barre 2-3 strings with other fingers too but will skip for now
    // 
   
    const fretFingers = vcs.reduce((acc, vc) => {
       var crt = acc.get(vc.fret) ?? 0;
       acc.set(vc.fret, crt + 1);
       return acc;
    }, new Map<number,number>());

    // Stupid JS string number sort
    const frets = Array.from(fretFingers.keys()).sort((a,b) => a-b);

    if (frets.length > 4) return false;

    var cnt = 0;
    var last = frets[0];
    for(var i = 0; i<frets.length; ++i) {
      var fret = frets[i];
      if (fret < last) {
        console.error('sort!', fret, last, frets, fretFingers);
      }
      // can't spread fingers too wide
      if (fret - last > 2) return false;
      // first fret can be a barre
      cnt +=  i==0 ? 1 : fretFingers.get(frets[i])!;
      last = fret;
    }

    // We can use at most 4 fingers
    return cnt <= 4;
  }

  function isLowestRoot(vcs:VoicingCandidate[]):boolean {
    var rootString = vcs.reduce((acc, n) => Math.max(acc, n.pitch == chordRootPc ? n.string : 0), 0);
    var lowestString = vcs.reduce((acc, n) => Math.max(acc, n.string), 0);
    return rootString == lowestString;
  }

  const pos = candidates(Array.from(chordPitches), [], 1, Array.from(voicingCandidates));
  var all = Array.from(pos);
  var voiced = all.filter(canBeVoiced);
  var good =  voiced.filter(isLowestRoot);

  if (good.length == 0) {
    // Fallback to any voicing, even if root is not lowest
    good = voiced;
  }

  if (good.length == 0) {
    return null;
  }

  good.sort((a,b) => b.length - a.length);

  var best = good[0];

  return buildVoicing(chordRootPc, chordName, intervals, best);
}

export function buildVoicing(chordRootPc: number, chordName: string, intervals:readonly number[], notes: VoicingCandidate[]):Voicing | null {
  var rootString = 0, rootFret = 0, minFret = 24, shape: string | null = null;
  var mutedStrings= [1,2,3,4,5,6];
  var positions:VoicingPosition[] = [];
  var minCnt = 0;
  
  for(var note of notes){
    if (note.pitch == chordRootPc) {
      if (!rootString || rootString < note.string) {
        rootString = note.string;
        rootFret = note.fret;
      }
    }

    if (note.fret < minFret) {
      minFret = note.fret;
      minCnt = 1;
    } else if (note.fret == minFret) {
      minCnt += 1;
    }

    var idx = mutedStrings.indexOf(note.string);
    if (idx > -1) {
      mutedStrings.splice(idx, 1);
    }

    positions.push({
      string: note.string,
      fret: note.fret,
      tone: toneInScale(note.pitch, chordRootPc, intervals)
    });
  }

  return {
    rootFret: rootFret,
    rootString: rootString,
    label: chordName,
    shape: shape,
    positions: positions,
    barreFret: minCnt > 1 ? minFret : null,
    mutedStrings: mutedStrings
  };
}

export function toneInScale(pitch: number, chordRootPc:number, intervals:readonly number[]):string {
  const distance = (pitch + 12 - chordRootPc) % 12;
  return TONE_NAMES[distance];
}

export function maxStringOnFret(fret:number, positions:VoicingPosition[]) {
  return positions.reduce((acc:number, vp:VoicingPosition) => vp.fret == fret ? Math.max(vp.string, acc) : acc, 0);
}