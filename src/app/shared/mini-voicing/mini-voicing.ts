import { Component, Input, OnChanges } from '@angular/core';
import { Voicing } from '../../core/caged';

interface Dot    { cx: number; cy: number; isRoot: boolean; }
interface Marker { x: number; y: number; symbol: string; isX: boolean; }
interface Barre  { x1: number; x2: number; cy: number; }

@Component({
  selector: 'app-mini-voicing',
  standalone: true,
  templateUrl: './mini-voicing.html',
  styleUrl: './mini-voicing.scss',
})
export class MiniVoicingComponent implements OnChanges {
  @Input() voicing!: Voicing;

  // ── Layout constants ──────────────────────────────────────────────────────
  private readonly SS    = 11;  // string spacing
  private readonly FH    = 14;  // fret row height
  private readonly FRETS = 4;
  private readonly PH    = 8;   // horizontal padding
  private readonly PT    = 14;  // pad top (marker row)
  private readonly PB    = 14;  // pad bottom (fret-label row)
  private readonly NUT   = 4;   // nut bar height

  // ── Computed geometry ─────────────────────────────────────────────────────
  svgWidth  = 0;
  svgHeight = 0;
  nutY      = 0;
  nutH      = 0;
  bodyTop   = 0;
  bodyBot   = 0;
  leftX     = 0;
  rightX    = 0;
  fretLines: number[] = [];
  dots:      Dot[]    = [];
  markers:   Marker[] = [];
  barre:      Barre | null = null;
  startFret   = 1;
  showLabel   = false;
  labelY      = 0;
  strings     = [1, 2, 3, 4, 5, 6];
  fretLabels: { fret: number; y: number }[] = [];

  private static readonly MARKER_FRETS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24]);

  ngOnChanges(): void { this.rebuild(); }

  strX(s: number): number { return this.PH + (6 - s) * this.SS; }

  private dotY(fret: number): number {
    return this.bodyTop + (fret - this.startFret + 0.5) * this.FH;
  }

  private rebuild(): void {
    if (!this.voicing) return;

    const positions  = this.voicing.positions;
    const muted      = new Set(this.voicing.mutedStrings);
    const hasOpen    = positions.some(p => p.fret === 0);
    const nonZero    = positions.filter(p => p.fret > 0).map(p => p.fret);
    const minFret    = nonZero.length ? Math.min(...nonZero) : 1;

    // Open chords (any fret-0) must show the nut — force startFret = 1.
    // Movable chords start at their lowest fretted position (the barre fret).
    this.startFret = hasOpen ? 1 : minFret;

    const showLabel = this.startFret > 1;
    this.showLabel  = showLabel;

    this.svgWidth  = this.PH * 2 + 5 * this.SS + 16; // +16 for fret number labels on right
    this.svgHeight = this.PT + this.NUT + this.FRETS * this.FH + (showLabel ? this.PB : this.PH);

    this.nutY    = this.PT;
    this.nutH    = this.NUT;
    this.bodyTop = this.PT + this.NUT;
    this.bodyBot = this.bodyTop + this.FRETS * this.FH;
    this.leftX   = this.PH;
    this.rightX  = this.PH + 5 * this.SS;
    this.labelY  = this.bodyBot + 10;

    this.fretLines = Array.from({ length: this.FRETS + 1 }, (_, i) => this.bodyTop + i * this.FH);

    // ── Barre bar ──────────────────────────────────────────────────────────
    // For movable chords (startFret > 1): draw a barre bar across ALL non-muted
    // strings at startFret. Conventional chord-diagram notation shows the barre
    // as the "virtual capo" that replaces the nut.
    // Barre only for CAGED shapes with no open strings (movable/barre chords).
    // Open chords: fret coincidences are not barre fingers.
    // Power chords: root-only index, no cross-string barre.
    const CAGED     = new Set(['E', 'A', 'D', 'C', 'G']);
    const isMovable = !hasOpen && this.voicing.shape && CAGED.has(this.voicing.shape);

    if (isMovable) {
      // Barre spans from rootString (lowest pitch = leftmost in chord diagram)
      // to str1 (highest pitch = rightmost). Covers D-shape str4→str1, etc.
      const rootStr = this.voicing.rootString;
      this.barre = {
        x1: this.strX(rootStr), // rootString x (leftmost end of barre)
        x2: this.strX(1),       // str1 x (rightmost end of barre)
        cy: this.dotY(this.startFret),
      };
    } else {
      this.barre = null;
    }

    // ── Finger dots ────────────────────────────────────────────────────────
    this.dots = positions
      .filter(p => p.fret > 0 && !(isMovable && p.fret === this.startFret))
      .map(p => ({
        cx: this.strX(p.string),
        cy: this.dotY(p.fret),
        isRoot: p.tone === '1',
      }));

    // ── Fret number labels (right side, for notable frets in range) ───────
    this.fretLabels = [];
    for (let f = this.startFret; f < this.startFret + this.FRETS; f++) {
      if (MiniVoicingComponent.MARKER_FRETS.has(f)) {
        this.fretLabels.push({ fret: f, y: this.dotY(f) });
      }
    }

    // ── X / O markers ─────────────────────────────────────────────────────
    const openSt = new Set(positions.filter(p => p.fret === 0).map(p => p.string));
    this.markers = [];
    for (let s = 1; s <= 6; s++) {
      if (muted.has(s)) {
        this.markers.push({ x: this.strX(s), y: this.PT - 2, symbol: '✕', isX: true });
      } else if (openSt.has(s)) {
        this.markers.push({ x: this.strX(s), y: this.PT - 2, symbol: '○', isX: false });
      }
    }
  }
}
