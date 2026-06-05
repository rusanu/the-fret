import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output } from '@angular/core';
import { ProgressionItem } from '../core/progression-item';
import { Voicing } from '../core/caged';
import { MiniVoicingComponent } from '../shared/mini-voicing/mini-voicing';

@Component({
  selector: 'app-progression-player',
  standalone: true,
  imports: [MiniVoicingComponent],
  templateUrl: './progression-player.html',
  styleUrl: './progression-player.scss'
})
export class ProgressionPlayerComponent implements OnChanges, OnDestroy {
  @Input() items: ProgressionItem[] = [];

  @Output() activeVoicingChanged = new EventEmitter<Voicing | null>();
  @Output() removeItem           = new EventEmitter<string>();
  @Output() clearAll             = new EventEmitter<void>();

  activeIndex = -1;
  bpm = 80;
  isPlaying = false;
  private timerId: ReturnType<typeof setInterval> | null = null;

  ngOnChanges(): void {
    // If items are removed, clamp activeIndex
    if (this.items.length === 0) {
      this.stop();
      this.activeIndex = -1;
      this.activeVoicingChanged.emit(null);
    } else if (this.activeIndex >= this.items.length) {
      this.activeIndex = this.items.length - 1;
      this.emitActive();
    }
  }

  ngOnDestroy(): void { this.stop(); }

  get msPerStep(): number { return (60_000 / this.bpm) * 4; }

  play(): void {
    if (this.items.length === 0) return;
    if (this.activeIndex < 0) this.activeIndex = 0;
    this.isPlaying = true;
    this.emitActive();
    this.timerId = setInterval(() => this.advance(), this.msPerStep);
  }

  stop(): void {
    if (this.timerId !== null) clearInterval(this.timerId);
    this.timerId = null;
    this.isPlaying = false;
    this.activeVoicingChanged.emit(null); // release the main fretboard
  }

  stepPrev(): void {
    if (this.items.length === 0) return;
    this.activeIndex = (this.activeIndex <= 0 ? this.items.length : this.activeIndex) - 1;
    this.emitActive();
  }

  stepNext(): void {
    if (this.items.length === 0) return;
    this.activeIndex = (this.activeIndex + 1) % this.items.length;
    this.emitActive();
  }

  jumpTo(index: number): void {
    this.activeIndex = index;
    this.emitActive();
  }

  onBpmInput(event: Event): void {
    const v = +(event.target as HTMLInputElement).value;
    if (!isNaN(v) && v >= 20 && v <= 300) {
      this.bpm = v;
      if (this.isPlaying) { this.stop(); this.play(); } // restart with new tempo
    }
  }

  onRemove(id: string): void {
    this.removeItem.emit(id);
  }

  onClear(): void {
    this.stop();
    this.clearAll.emit();
  }

  private advance(): void {
    if (this.items.length === 0) { this.stop(); return; }
    this.activeIndex = (this.activeIndex + 1) % this.items.length;
    this.emitActive();
  }

  private emitActive(): void {
    const item = this.items[this.activeIndex];
    this.activeVoicingChanged.emit(item?.voicing ?? null);
  }

  // Display helpers
  chipLabel(item: ProgressionItem): string {
    // voicing.label is e.g. "Am  (E-shape)" — clean up the double space
    return item.voicing.label.replace(/\s+/g, ' ').trim();
  }
}
