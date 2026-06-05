import { Component, Input, OnChanges } from '@angular/core';
import { Voicing } from '../../core/caged';

interface Dot    { cx: number; cy: number; isRoot: boolean; }
interface Marker { x: number; y: number; symbol: string; isX: boolean; }

@Component({
  selector: 'app-mini-voicing',
  standalone: true,
  templateUrl: './mini-voicing.html',
  styleUrl: './mini-voicing.scss',
})
export class MiniVoicingComponent implements OnChanges {
  @Input() voicing!: Voicing;

  // ── Layout constants ──────────────────────────────────────────────────────
  private readonly SS    = 11;  // string spacing (5 gaps → 55px body width)
  private readonly FH    = 14;  // fret height
  private readonly FRETS = 4;   // rows shown
  private readonly PH    = 8;   // horizontal padding
  private readonly PT    = 14;  // pad top (X/O row)
  private readonly PB    = 14;  // pad bottom (fret-number row)
  private readonly NUT   = 4;   // nut/top-line height

  // ── Computed geometry (rebuilt on input change) ───────────────────────────
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

    // Start fret = lowest non-open fret present
    const fretted = this.voicing.positions.filter(p => p.fret > 0).map(p => p.fret);
    this.startFret = fretted.length ? Math.min(...fretted) : 1;

    const showLabel = this.startFret > 1;
    this.showLabel = showLabel;

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

    // Dots (fretted positions within the 4-fret window)
    this.dots = this.voicing.positions
      .filter(p => p.fret > 0)
      .map(p => ({
        cx: this.strX(p.string),
        cy: this.dotY(p.fret),
        isRoot: p.tone === '1',
      }));

    // X / O markers above nut
    const muted  = new Set(this.voicing.mutedStrings);
    const openSt = new Set(this.voicing.positions.filter(p => p.fret === 0).map(p => p.string));
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
