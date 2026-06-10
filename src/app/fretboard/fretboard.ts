import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { noteAt, noteNameAt, NOTE_NAMES_COMMON } from '../core/pitch';
import { degreeLabel, pitchesInSet } from '../core/pitch-set';
import { maxStringOnFret, Voicing } from '../core/voicing';
import { Region } from '../core/region';
import { STANDARD_TUNING } from '../core/tuning';

export type NoteState = 'root' | 'in-set' | 'out-of-set' | 'normal';

export interface HighlightSet {
  root: number;
  intervals: readonly number[];
  strings?: readonly number[];
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
  isOpen: boolean;
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

interface BandCell {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  isSelected: boolean;
  region: Region;
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
  @Input() noteNames: readonly string[] = NOTE_NAMES_COMMON;
  @Input() activeRegion: Region | null = null;
  @Input() voicing: Voicing | null = null;
  @Input() chordHighlightPcs: Set<number> | null = null;
  @Input() regionBands: Region[] = [];
  @Input() selectedRegionId: string | null = null;
  @Output() regionBandClick = new EventEmitter<Region | null>();

  readonly LW = 32;
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
  pentBandCells: BandCell[] = [];
  cagedBandCells: BandCell[] = [];
  bandGroupLabelY = 0;
  pentBandY = 0;
  cagedBandY = 0;
  readonly BAND_H = 18;
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
        'activeRegion' in changes || 'voicing' in changes || 'noteNames' in changes ||
        'regionBands' in changes || 'selectedRegionId' in changes) {
      this.rebuild();
    }
  }

  onBandClick(region: Region): void {
    // Toggle: clicking the active region deselects it
    this.regionBandClick.emit(region.id === this.selectedRegionId ? null : region);
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

    const hasBands = this.regionBands.some(r => r.group !== 'blues');
    const BAND_GAP = 4;
    const bandsExtra = hasBands ? 8 + this.BAND_H + BAND_GAP + this.BAND_H + 6 : 20;

    this.svgWidth  = this.LW + (fc + 1) * this.FW + 8;
    this.svgHeight = neckBottom + bandsExtra;
    this.viewBox = `0 0 ${this.svgWidth} ${this.svgHeight}`;

    // Band positions
    this.pentBandY = neckBottom + 8;
    this.cagedBandY = this.pentBandY + this.BAND_H + BAND_GAP;

    // Band cells
    this.pentBandCells = [];
    this.cagedBandCells = [];
    for (const r of this.regionBands) {
      if (r.group === 'blues') continue;
      const x = this.LW + r.startFret * this.FW;
      const w = (r.endFret - r.startFret + 1) * this.FW;
      const cell: BandCell = { id: r.id, label: r.shortLabel, x, w, y: 0, h: this.BAND_H, isSelected: r.id === this.selectedRegionId, region: r };
      if (r.group === 'pentatonic') { cell.y = this.pentBandY; this.pentBandCells.push(cell); }
      else                          { cell.y = this.cagedBandY; this.cagedBandCells.push(cell); }
    }

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
      const positions    = this.voicing.positions;
      const nonZero      = positions.filter(p => p.fret > 0).map(p => p.fret);
      const barFret      = nonZero.length ? Math.min(...nonZero) : 0;
      const hasOpenStr   = positions.some(p => p.fret === 0);
      // Barre only for CAGED shapes with no open strings (i.e. movable/barre chords).
      // Open chords: strings share frets by coincidence — no barre finger.
      // Power chords: index finger plays root only, no cross-string barre.
      const CAGED        = new Set(['E', 'A', 'D', 'C', 'G']);
      const isMovable    = !hasOpenStr && this.voicing.shape && CAGED.has(this.voicing.shape);

      if (isMovable) {
        // Barre spans from the shape's root string (lowest pitch in barre, largest string number)
        // down to str1 (highest pitch). This correctly covers D-shape (str4→str1),
        // A-shape (str5→str1), E-shape (str6→str1) etc.
        const rootStr = this.voicing.rootString;
        this.voicingBarre = {
          cx: this.nx(barFret),
          y1: this.ny(1)       - this.DOT_R, // str1 = top in fretboard (smallest y)
          y2: this.ny(rootStr) + this.DOT_R, // rootStr = bottom of barre
        };
      } else {

        this.voicingBarre = this.voicing.barreFret ? {
          cx: this.nx(this.voicing.barreFret!),
          y1: this.ny(1) - this.DOT_R,
          y2: this.ny(maxStringOnFret(this.voicing.barreFret, this.voicing.positions)) + this.DOT_R,
        } : null;
      }

      this.voicingDots = positions
        //.filter(p => !(isMovable && p.fret === barFret)) // exclude barre positions
        .map(p => ({
          id: `v${p.string}`,
          cx: this.nx(p.fret),
          cy: this.ny(p.string),
          tone: p.tone,
          noteName: noteNameAt(p.string, p.fret, this.tuning, this.noteNames),
          isRoot: p.tone === '1',
          isOpen: p.fret === 0,
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
    const strings = hs ? hs.strings : null;
    const region = this.activeRegion;

    this.notes = [];
    for (let s = 1; s <= 6; s++) {
      for (let f = 0; f <= fc; f++) {
        const pc   = noteAt(s, f, this.tuning);
        const name = noteNameAt(s, f, this.tuning, this.noteNames);

        let state: NoteState = 'normal';
        let degree = '';

        if (hs && setNotes) {
          // Honor string subset scales first
          if (strings && !strings.includes(s))
          {
            state = 'out-of-set';
          } else if (pc === hs.root) {
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
