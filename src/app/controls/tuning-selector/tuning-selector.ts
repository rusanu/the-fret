import { Component, EventEmitter, Output } from '@angular/core';
import { Tuning, TUNING_PRESETS } from '../../core/tuning';

@Component({
  selector: 'app-tuning-selector',
  standalone: true,
  templateUrl: './tuning-selector.html',
  styleUrl: './tuning-selector.scss'
})
export class TuningSelectorComponent {
  @Output() tuningSelected = new EventEmitter<Tuning>();

  readonly presets = TUNING_PRESETS;

  onChange(event: Event): void {
    const name = (event.target as HTMLSelectElement).value;
    const preset = this.presets.find(p => p.name === name);
    if (preset) this.tuningSelected.emit(preset.strings);
  }
}
