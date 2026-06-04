import { Component, EventEmitter, Output } from '@angular/core';
import { PITCH_SET_LIBRARY, PitchSetDef } from '../../core/pitch-set';

@Component({
  selector: 'app-pitch-set-selector',
  standalone: true,
  templateUrl: './pitch-set-selector.html',
  styleUrl: './pitch-set-selector.scss'
})
export class PitchSetSelectorComponent {
  @Output() setSelected = new EventEmitter<PitchSetDef | null>();

  readonly scales    = PITCH_SET_LIBRARY.filter(p => p.category === 'scale');
  readonly modes     = PITCH_SET_LIBRARY.filter(p => p.category === 'mode');
  readonly arpeggios = PITCH_SET_LIBRARY.filter(p => p.category === 'arpeggio');

  private readonly lookup = new Map(PITCH_SET_LIBRARY.map(p => [p.name, p]));

  onChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.setSelected.emit(value ? (this.lookup.get(value) ?? null) : null);
  }
}
