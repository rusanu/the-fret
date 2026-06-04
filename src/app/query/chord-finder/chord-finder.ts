import { Component, EventEmitter, Output } from '@angular/core';
import { RootSelectorComponent } from '../../controls/root-selector/root-selector';
import { NOTE_NAMES_COMMON } from '../../core/pitch';
import { PITCH_SET_LIBRARY, PitchSetDef } from '../../core/pitch-set';

export interface ChordQuery {
  rootPc: number;
  intervals: readonly number[];
  chordName: string;
  fret: number;
}

@Component({
  selector: 'app-chord-finder',
  standalone: true,
  imports: [RootSelectorComponent],
  templateUrl: './chord-finder.html',
  styleUrl: './chord-finder.scss'
})
export class ChordFinderComponent {
  @Output() findChord = new EventEmitter<ChordQuery>();

  readonly chordTypes: PitchSetDef[] = PITCH_SET_LIBRARY.filter(p => p.category === 'arpeggio') as PitchSetDef[];

  selectedRoot: number | null = null;
  selectedType: PitchSetDef = this.chordTypes[0]; // default: Power (5)
  targetFret = 5;

  get rootName(): string {
    return this.selectedRoot !== null ? NOTE_NAMES_COMMON[this.selectedRoot] : '—';
  }

  onRootSelected(pc: number | null): void {
    this.selectedRoot = pc;
  }

  onTypeChange(event: Event): void {
    const name = (event.target as HTMLSelectElement).value;
    this.selectedType = this.chordTypes.find(t => t.name === name) ?? this.chordTypes[0];
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
      fret: this.targetFret,
    });
  }
}
