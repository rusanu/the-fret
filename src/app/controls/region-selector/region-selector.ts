import { Component, EventEmitter, Input, OnChanges, Output, ViewChild, ElementRef } from '@angular/core';
import { Region } from '../../core/region';

@Component({
  selector: 'app-region-selector',
  standalone: true,
  templateUrl: './region-selector.html',
  styleUrl: './region-selector.scss'
})
export class RegionSelectorComponent implements OnChanges {
  @Input() regions: Region[] = [];
  @Input() selectedRegionId: string | null = null;
  @Output() regionSelected = new EventEmitter<Region | null>();

  @ViewChild('selectEl') selectEl!: ElementRef<HTMLSelectElement>;

  pentatonic: Region[] = [];
  caged: Region[] = [];
  blues: Region[] = [];

  ngOnChanges(): void {
    this.pentatonic = this.regions.filter(r => r.group === 'pentatonic');
    this.caged      = this.regions.filter(r => r.group === 'caged');
    this.blues      = this.regions.filter(r => r.group === 'blues');
    // Sync the native select to the parent-controlled selection (after view is ready)
    if (this.selectEl) {
      this.selectEl.nativeElement.value = this.selectedRegionId ?? '';
    }
  }

  onChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const region = value ? (this.regions.find(r => r.id === value) ?? null) : null;
    this.regionSelected.emit(region);
  }
}
