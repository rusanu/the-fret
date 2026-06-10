import { fretForPitchClass, NOTE_NAMES_COMMON, noteAt } from './pitch';
import { pitchesInSet, PitchSetDef } from './pitch-set';
import { Region } from './region';
import { Tuning } from './tuning';

// Semitone interval above chord root for each tone label
const TONE_SEMITONES: Record<string, number> = {
  '1': 0, 'b2': 1, '2': 2, 'b3': 3, '3': 4, '4': 5,
  'b5': 6, '5': 7, 'b6': 8, '6': 9, 'b7': 10, '7': 11,
};

export const TONE_NAMES: string[] = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

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
    if ((bottomS - topS + 1) != vcs.length) return false;

   //  console.log(topS, bottomS, vcs);

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