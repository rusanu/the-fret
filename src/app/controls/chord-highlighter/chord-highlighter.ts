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
  @Output() chordPcsChanged = new EventEmitter<Set<number> | null>();

  chords: DiatonicChord[] = [];
  selectedChord: DiatonicChord | null = null;

  // Only show the highlighter for scales with 7 notes (heptatonic)
  get isVisible(): boolean {
    return (this.highlightSet?.intervals.length ?? 0) >= 7;
  }

  ngOnChanges(): void {
    this.chords = [];
    this.selectedChord = null;
    this.chordPcsChanged.emit(null);

    if (!this.isVisible || !this.highlightSet) return;
    this.chords = getDiatonicTriads(this.highlightSet.root, this.highlightSet.intervals);
  }

  select(chord: DiatonicChord): void {
    if (this.selectedChord === chord) {
      this.selectedChord = null;
      this.chordPcsChanged.emit(null);
    } else {
      this.selectedChord = chord;
      this.chordPcsChanged.emit(chord.pitchClasses);
    }
  }
}
