import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RootSelectorComponent } from '../../controls/root-selector/root-selector';
import { NOTE_NAMES_COMMON } from '../../core/pitch';
import { PITCH_SET_LIBRARY, PitchSetDef } from '../../core/pitch-set';

export interface ChordQuery {
  rootPc: number;
  intervals: readonly number[];
  chordName: string;
  fret: number;
  shapeId: string; // 'auto' or specific CAGED shape id (E/A/D/C/G)
}

@Component({
  selector: 'app-chord-finder',
  standalone: true,
  imports: [RootSelectorComponent],
  templateUrl: './chord-finder.html',
  styleUrl: './chord-finder.scss'
})
export class ChordFinderComponent {
  @Input() noResult = false;
  @Output() findChord = new EventEmitter<ChordQuery>();

  readonly chordTypes: PitchSetDef[] = PITCH_SET_LIBRARY.filter(p => p.category === 'arpeggio') as PitchSetDef[];
  readonly shapeOptions = [
    { id: 'auto', label: 'Any shape' },
    { id: 'E', label: 'E shape' }, { id: 'A', label: 'A shape' },
    { id: 'D', label: 'D shape' }, { id: 'C', label: 'C shape' }, { id: 'G', label: 'G shape' },
  ];

  selectedRoot: number | null = null;
  selectedType: PitchSetDef = this.chordTypes[0];
  selectedShape = 'auto';
  targetFret = 5;

  // Shape selector only makes sense for chords that map to a CAGED shape (triads+)
  get isCagedCompatible(): boolean {
    return this.selectedType.intervals.length > 2;
  }

  get rootName(): string {
    return this.selectedRoot !== null ? NOTE_NAMES_COMMON[this.selectedRoot] : '—';
  }

  onRootSelected(pc: number | null): void { this.selectedRoot = pc; }

  onTypeChange(event: Event): void {
    const name = (event.target as HTMLSelectElement).value;
    this.selectedType = this.chordTypes.find(t => t.name === name) ?? this.chordTypes[0];
    if (!this.isCagedCompatible) this.selectedShape = 'auto';
  }

  onShapeChange(event: Event): void {
    this.selectedShape = (event.target as HTMLSelectElement).value;
  }

  onFretInput(event: Event): void {
    const v = +(event.target as HTMLInputElement).value;
    if (!isNaN(v) && v >= 0 && v <= 24) this.targetFret = v;
  }

  onFind(): void {
    if (this.selectedRoot === null) return;
    this.findChord.emit({
      rootPc: this.selectedRoot,
      intervals: this.selectedType.intervals,
      chordName: this.selectedType.name,
      fret: this.selectedShape === 'auto' ? this.targetFret : 0,
      shapeId: this.selectedShape,
    });
  }
}
