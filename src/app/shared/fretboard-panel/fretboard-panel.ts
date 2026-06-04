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
  @Output() close = new EventEmitter<string>();
}
