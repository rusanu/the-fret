import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { noteNameAt } from '../core/pitch';
import { STANDARD_TUNING } from '../core/tuning';

interface NoteCell {
  id: string;
  cx: number;
  cy: number;
  name: string;
  isOpen: boolean;
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
  @Input() showNoteLabels = true;

  // Layout constants (px)
  private readonly LW = 32;   // left label column width
  private readonly FW = 40;   // fret slot width
  private readonly PT = 26;   // pad top (space for fret number labels)
  private readonly SS = 26;   // string spacing

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
  private readonly STR_WEIGHTS = [1, 1.5, 2, 2.5, 3, 3.5]; // string 1–6

  ngOnInit(): void { this.rebuild(); }
  ngOnChanges(): void { this.rebuild(); }

  private nx(fret: number): number { return this.LW + (fret + 0.5) * this.FW; }
  private ny(s: number): number    { return this.PT + (s - 1) * this.SS; }

  private rebuild(): void {
    const fc = this.fretCount;

    const neckTop    = this.PT - 4;
    const neckBottom = this.PT + 5 * this.SS + 4;

    this.svgWidth  = this.LW + (fc + 1) * this.FW + 8;
    this.svgHeight = neckBottom + 20; // extra space below for fret dots if any

    this.viewBox = `0 0 ${this.svgWidth} ${this.svgHeight}`;

    // Neck background starts at the nut
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

    // Fret wires: n=0 is the nut, n=1..fc are the fret wires
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

    this.notes = [];
    for (let s = 1; s <= 6; s++) {
      for (let f = 0; f <= fc; f++) {
        this.notes.push({
          id: `n${s}-${f}`,
          cx: this.nx(f),
          cy: this.ny(s),
          name: noteNameAt(s, f, this.tuning),
          isOpen: f === 0
        });
      }
    }
  }
}
