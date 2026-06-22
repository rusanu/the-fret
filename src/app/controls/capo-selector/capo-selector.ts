import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-capo-selector',
  standalone: true,
  templateUrl: './capo-selector.html',
  styleUrl: './capo-selector.scss'
})
export class CapoSelectorComponent {
  @Input() capo = 0;
  @Output() capoChanged = new EventEmitter<number>();

  readonly options = Array.from({ length: 13 }, (_, i) => i);

  onChange(event: Event): void {
    const value = +(event.target as HTMLSelectElement).value;
    this.capoChanged.emit(value);
  }
}
