import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { DiatonicChord, getDiatonicTriads } from '../../core/harmony';
import { HighlightSet } from '../../fretboard/fretboard';

@Component({
  selector: 'app-chord-highlighter',
  standalone: true,
  templateUrl: './chord-highlighter.html',
  styleUrl: './chord-highlighter.scss'
})
export class ChordHighlighterComponent implements OnChanges {
  @Input() highlightSet: HighlightSet | null = null;
  @Input() canAddToProgression = false;

  @Output() chordPcsChanged    = new EventEmitter<{ pcs: Set<number>; label: string } | null>();
  @Output() chordSelected      = new EventEmitter<DiatonicChord | null>();
  @Output() addToProgression   = new EventEmitter<DiatonicChord>();

  chords: DiatonicChord[] = [];
  selectedChord: DiatonicChord | null = null;

  get isVisible(): boolean {
    return (this.highlightSet?.intervals.length ?? 0) >= 7;
  }

  ngOnChanges(): void {
    // Only update own internal state here — do NOT emit to parent.
    // Parent (AppComponent) resets its chord-highlight state in onRootSelected /
    // onSetSelected before change detection starts, avoiding NG0100.
    this.chords = [];
    this.selectedChord = null;
    if (!this.isVisible || !this.highlightSet) return;
    this.chords = getDiatonicTriads(this.highlightSet.root, this.highlightSet.intervals);
  }

  select(chord: DiatonicChord): void {
    if (this.selectedChord === chord) {
      this.selectedChord = null;
      this.chordPcsChanged.emit(null);
      this.chordSelected.emit(null);
    } else {
      this.selectedChord = chord;
      this.chordPcsChanged.emit({ pcs: chord.pitchClasses, label: `${chord.numeral} ${chord.name}` });
      this.chordSelected.emit(chord);
    }
  }

  onAddToProgression(): void {
    if (this.selectedChord) this.addToProgression.emit(this.selectedChord);
  }
}
