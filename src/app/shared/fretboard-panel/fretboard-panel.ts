import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Voicing } from '../../core/caged';
import { Region } from '../../core/region';
import { Tuning, STANDARD_TUNING } from '../../core/tuning';
import { FretboardComponent, HighlightSet } from '../../fretboard/fretboard';

export interface FretboardPanel {
  id: string;
  title: string;
  type: 'voicing' | 'snapshot';
  voicing: Voicing | null;
  highlightSet: HighlightSet | null;
  activeRegion: Region | null;
  showNoteLabels: boolean;
  showDegrees: boolean;
  tuning: Tuning;
  chordHighlightPcs: Set<number> | null;
}

export { STANDARD_TUNING }; // re-export for panel creation convenience

@Component({
  selector: 'app-fretboard-panel',
  standalone: true,
  imports: [FretboardComponent],
  templateUrl: './fretboard-panel.html',
  styleUrl: './fretboard-panel.scss'
})
export class FretboardPanelComponent {
  @Input() panel!: FretboardPanel;
  @Input() currentTuning: Tuning = STANDARD_TUNING;
  @Output() close            = new EventEmitter<string>();
  @Output() addToProgression = new EventEmitter<Voicing>();

  get canAddToProgression(): boolean {
    if (this.panel.type !== 'voicing' || !this.panel.voicing) return false;
    // Panel tuning must match the active tuning — cross-tuning progressions are unplayable.
    return this.panel.tuning.length === this.currentTuning.length &&
           this.panel.tuning.every((s, i) => s === this.currentTuning[i]);
  }
}
