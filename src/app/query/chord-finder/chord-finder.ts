import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NOTE_NAMES_COMMON } from '../../core/pitch';

export interface ChordQuery {
  quality: 'major' | 'minor';
  fret: number;
}

@Component({
  selector: 'app-chord-finder',
  standalone: true,
  templateUrl: './chord-finder.html',
  styleUrl: './chord-finder.scss'
})
export class ChordFinderComponent {
  @Input() rootPc: number | null = null;
  @Output() findChord  = new EventEmitter<ChordQuery>();
  @Output() clearChord = new EventEmitter<void>();

  quality: 'major' | 'minor' = 'minor';
  targetFret = 5;

  get rootName(): string {
    return this.rootPc !== null ? NOTE_NAMES_COMMON[this.rootPc] : '—';
  }

  onFretInput(event: Event): void {
    const v = +(event.target as HTMLInputElement).value;
    if (!isNaN(v) && v >= 0 && v <= 24) this.targetFret = v;
  }

  onFind(): void {
    if (this.rootPc === null) return;
    this.findChord.emit({ quality: this.quality, fret: this.targetFret });
  }

  onClear(): void {
    this.clearChord.emit();
  }
}
