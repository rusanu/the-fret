import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { noteAt, noteNameAt } from '../core/pitch';
import { degreeLabel, pitchesInSet } from '../core/pitch-set';
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
  name: string;
  degree: string;
  isOpen: boolean;
  state: NoteState;
}

interface FretWire {
  x: number;
  isNut: boolean;
}

interface InlayDot {
  id: string;
  cx: number;
  cy: number;
}

interface StringInfo {
  num: number;
  y: number;
  strokeWidth: number;
}

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

  // Layout constants (px)
  private readonly LW = 32;
  private readonly FW = 40;
  private readonly PT = 26;
  private readonly SS = 26;

  readonly DOT_R = 9;

  // SVG geometry (set by rebuild)
  viewBox = '';
  svgWidth = 0;
  svgHeight = 0;
  neckX = 0;
  neckY = 0;
  neckW = 0;
  neckH = 0;
  stringX1 = 0;
  stringX2 = 0;

  strings: StringInfo[] = [];
  fretWires: FretWire[] = [];
  inlayDots: InlayDot[] = [];
  fretLabels: { x: number; label: string }[] = [];
  stringLabels: { x: number; y: number; label: string }[] = [];
  notes: NoteCell[] = [];

  private readonly MARKER_FRETS = new Set([3, 5, 7, 9, 15, 17, 19, 21]);
  private readonly DOUBLE_FRETS  = new Set([12, 24]);
  private readonly LABEL_FRET_NUMS = [0, 3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
  private readonly STR_WEIGHTS = [1, 1.5, 2, 2.5, 3, 3.5];

  ngOnInit(): void { this.rebuild(); }

  ngOnChanges(changes: SimpleChanges): void {
    if ('tuning' in changes || 'fretCount' in changes || 'highlightSet' in changes) {
      this.rebuild();
    }
  }

  shouldShowLabel(note: NoteCell): boolean {
    if (note.state === 'out-of-set') return false;
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

    this.strings = [1, 2, 3, 4, 5, 6].map(s => ({
      num: s,
      y: this.ny(s),
      strokeWidth: this.STR_WEIGHTS[s - 1]
    }));

    this.fretWires = Array.from({ length: fc + 1 }, (_, n) => ({
      x: this.LW + (n + 1) * this.FW,
      isNut: n === 0
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
      x: this.LW - 5,
      y: this.ny(s) + 4,
      label: String(s)
    }));

    const hs = this.highlightSet;
    const setNotes = hs ? pitchesInSet(hs.root, hs.intervals) : null;

    this.notes = [];
    for (let s = 1; s <= 6; s++) {
      for (let f = 0; f <= fc; f++) {
        const pc   = noteAt(s, f, this.tuning);
        const name = noteNameAt(s, f, this.tuning);

        let state: NoteState = 'normal';
        let degree = '';

        if (hs && setNotes) {
          if (pc === hs.root) {
            state  = 'root';
            degree = '1';
          } else if (setNotes.has(pc)) {
            state  = 'in-set';
            degree = degreeLabel(pc, hs.root);
          } else {
            state = 'out-of-set';
          }
        }

        this.notes.push({ id: `n${s}-${f}`, cx: this.nx(f), cy: this.ny(s), name, degree, isOpen: f === 0, state });
      }
    }
  }
}
