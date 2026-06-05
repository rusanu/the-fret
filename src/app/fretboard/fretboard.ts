import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { noteAt, noteNameAt } from '../core/pitch';
import { degreeLabel, pitchesInSet } from '../core/pitch-set';
import { Voicing } from '../core/caged';
import { Region } from '../core/region';
import { STANDARD_TUNING } from '../core/tuning';

export type NoteState = 'root' | 'in-set' | 'out-of-set' | 'normal';

export interface HighlightSet {
  root: number;
  intervals: readonly number[];
}

interface NoteCell {
  id: string;
  cx: number;
  cy: number;
  pc: number;
  name: string;
  degree: string;
  isOpen: boolean;
  state: NoteState;
  inRegion: boolean;
}

interface VoicingDot {
  id: string;
  cx: number;
  cy: number;
  tone: string;
  noteName: string;
  isRoot: boolean;
}

interface MutedMarker {
  id: string;
  cx: number;
  cy: number;
}

interface VoicingBarre {
  cx: number;
  y1: number;  // top of bar (smaller y = higher string = string 1)
  y2: number;  // bottom of bar
}

interface FretWire { x: number; isNut: boolean; }
interface InlayDot { id: string; cx: number; cy: number; }
interface StringInfo { num: number; y: number; strokeWidth: number; }

@Component({
  selector: 'app-fretboard',
  standalone: true,
  templateUrl: './fretboard.html',
  styleUrl: './fretboard.scss'
})
export class FretboardComponent implements OnInit, OnChanges {
  @Input() tuning: readonly string[] = STANDARD_TUNING;
  @Input() fretCount = 24;
  @Input() showNoteLabels = false;
  @Input() showDegrees = false;
  @Input() dimUnset = true;
  @Input() highlightSet: HighlightSet | null = null;
  @Input() activeRegion: Region | null = null;
  @Input() voicing: Voicing | null = null;
  @Input() chordHighlightPcs: Set<number> | null = null;

  private readonly LW = 32;
  private readonly FW = 40;
  private readonly PT = 26;
  private readonly SS = 26;

  readonly DOT_R = 9;

  viewBox = '';
  svgWidth = 0;
  svgHeight = 0;
  neckX = 0;
  neckY = 0;
  neckW = 0;
  neckH = 0;
  stringX1 = 0;
  stringX2 = 0;
  regionBracketX = 0;
  regionBracketW = 0;

  strings: StringInfo[] = [];
  fretWires: FretWire[] = [];
  inlayDots: InlayDot[] = [];
  fretLabels: { x: number; label: string }[] = [];
  stringLabels: { x: number; y: number; label: string }[] = [];
  notes: NoteCell[] = [];
  voicingDots: VoicingDot[] = [];
  mutedMarkers: MutedMarker[] = [];
  voicingBarre: VoicingBarre | null = null;

  private readonly MARKER_FRETS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
  private readonly DOUBLE_FRETS  = new Set([12, 24]);
  private readonly LABEL_FRET_NUMS = [0, 3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
  private readonly STR_WEIGHTS = [1, 1.5, 2, 2.5, 3, 3.5];

  ngOnInit(): void { this.rebuild(); }

  ngOnChanges(changes: SimpleChanges): void {
    if ('tuning' in changes || 'fretCount' in changes || 'highlightSet' in changes ||
        'activeRegion' in changes || 'voicing' in changes) {
      this.rebuild();
    }
  }

  shouldShowLabel(note: NoteCell): boolean {
    if (note.state === 'out-of-set') return false;
    if (this.activeRegion && !note.inRegion) return false;
    if (note.state === 'root' || note.state === 'in-set') return true;
    return this.showNoteLabels;
  }

  labelText(note: NoteCell): string {
    return this.showDegrees && note.degree ? note.degree : note.name;
  }

  private nx(fret: number): number { return this.LW + (fret + 0.5) * this.FW; }
  private ny(s: number): number    { return this.PT + (s - 1) * this.SS; }

  private rebuild(): void {
    const fc = this.fretCount;
    const neckTop    = this.PT - 4;
    const neckBottom = this.PT + 5 * this.SS + 4;

    this.svgWidth  = this.LW + (fc + 1) * this.FW + 8;
    this.svgHeight = neckBottom + 20;
    this.viewBox = `0 0 ${this.svgWidth} ${this.svgHeight}`;

    this.neckX = this.LW + this.FW;
    this.neckY = neckTop;
    this.neckW = fc * this.FW;
    this.neckH = neckBottom - neckTop;

    this.stringX1 = this.LW;
    this.stringX2 = this.LW + (fc + 1) * this.FW;

    if (this.activeRegion) {
      this.regionBracketX = this.LW + this.activeRegion.startFret * this.FW;
      this.regionBracketW = (this.activeRegion.endFret - this.activeRegion.startFret + 1) * this.FW;
    }

    this.strings = [1, 2, 3, 4, 5, 6].map(s => ({
      num: s, y: this.ny(s), strokeWidth: this.STR_WEIGHTS[s - 1]
    }));

    this.fretWires = Array.from({ length: fc + 1 }, (_, n) => ({
      x: this.LW + (n + 1) * this.FW, isNut: n === 0
    }));

    const inlayMidY = this.PT + 2.5 * this.SS;
    this.inlayDots = [];
    for (let f = 1; f <= fc; f++) {
      const cx = this.nx(f);
      if (this.MARKER_FRETS.has(f)) {
        this.inlayDots.push({ id: `i${f}`, cx, cy: inlayMidY });
      } else if (this.DOUBLE_FRETS.has(f)) {
        this.inlayDots.push({ id: `i${f}a`, cx, cy: inlayMidY - 7 });
        this.inlayDots.push({ id: `i${f}b`, cx, cy: inlayMidY + 7 });
      }
    }

    this.fretLabels = this.LABEL_FRET_NUMS
      .filter(f => f <= fc)
      .map(f => ({ x: this.nx(f), label: String(f) }));

    this.stringLabels = [1, 2, 3, 4, 5, 6].map(s => ({
      x: this.LW - 5, y: this.ny(s) + 4, label: String(s)
    }));

    // Voicing dots (replaces scale dots when voicing is active)
    if (this.voicing) {
      const positions  = this.voicing.positions;
      const nonZero    = positions.filter(p => p.fret > 0).map(p => p.fret);
      const barFret    = nonZero.length ? Math.min(...nonZero) : 0;
      const barrePoss  = positions.filter(p => p.fret === barFret);
      const hasBar     = barFret > 0 && barrePoss.length >= 2;

      if (hasBar) {
        const strings = barrePoss.map(p => p.string);
        const topStr  = Math.min(...strings); // lowest string number = highest pitch = top
        const botStr  = Math.max(...strings);
        this.voicingBarre = {
          cx: this.nx(barFret),
          y1: this.ny(topStr) - this.DOT_R,
          y2: this.ny(botStr) + this.DOT_R,
        };
      } else {
        this.voicingBarre = null;
      }

      this.voicingDots = positions
        .filter(p => p.fret > 0 && !(hasBar && p.fret === barFret))
        .map(p => ({
          id: `v${p.string}`,
          cx: this.nx(p.fret),
          cy: this.ny(p.string),
          tone: p.tone,
          noteName: noteNameAt(p.string, p.fret, this.tuning),
          isRoot: p.tone === '1',
        }));
      this.mutedMarkers = this.voicing.mutedStrings.map(s => ({
        id: `mx${s}`, cx: this.nx(0), cy: this.ny(s),
      }));
    } else {
      this.voicingDots = [];
      this.mutedMarkers = [];
      this.voicingBarre = null;
    }

    // Scale / arpeggio note cells (used when no voicing is active)
    const hs = this.highlightSet;
    const setNotes = hs ? pitchesInSet(hs.root, hs.intervals) : null;
    const region = this.activeRegion;

    this.notes = [];
    for (let s = 1; s <= 6; s++) {
      for (let f = 0; f <= fc; f++) {
        const pc   = noteAt(s, f, this.tuning);
        const name = noteNameAt(s, f, this.tuning);

        let state: NoteState = 'normal';
        let degree = '';

        if (hs && setNotes) {
          if (pc === hs.root) {
            state = 'root'; degree = '1';
          } else if (setNotes.has(pc)) {
            state = 'in-set'; degree = degreeLabel(pc, hs.root);
          } else {
            state = 'out-of-set';
          }
        }

        const inRegion = !region || (f >= region.startFret && f <= region.endFret);
        this.notes.push({ id: `n${s}-${f}`, cx: this.nx(f), cy: this.ny(s), pc, name, degree, isOpen: f === 0, state, inRegion });
      }
    }
  }
}
