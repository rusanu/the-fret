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
  barre:     Barre | null = null;
  startFret  = 1;
  showLabel  = false;
  labelY     = 0;
  strings    = [1, 2, 3, 4, 5, 6];

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

    this.svgWidth  = this.PH * 2 + 5 * this.SS;
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
    if (this.startFret > 1) {
      const barreStrings = positions
        .filter(p => p.fret === this.startFret)
        .map(p => p.string);

      if (barreStrings.length >= 2) {
        // Span from the highest (numerically largest, = lowest pitch = leftmost)
        // to the lowest (numerically smallest, = highest pitch = rightmost) string.
        const x1 = Math.min(...barreStrings.map(s => this.strX(s)));
        const x2 = Math.max(...barreStrings.map(s => this.strX(s)));
        this.barre = { x1, x2, cy: this.dotY(this.startFret) };
      } else {
        this.barre = null;
      }
    } else {
      this.barre = null;
    }

    // ── Finger dots ────────────────────────────────────────────────────────
    // Skip positions at startFret when a barre bar is drawn (the bar represents them).
    const barreActive = this.barre !== null;
    this.dots = positions
      .filter(p => p.fret > 0 && !(barreActive && p.fret === this.startFret))
      .map(p => ({
        cx: this.strX(p.string),
        cy: this.dotY(p.fret),
        isRoot: p.tone === '1',
      }));

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
