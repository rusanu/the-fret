import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ChordExtension, DiatonicChord, getDiatonicChords } from '../../core/harmony';
import { HighlightSet } from '../../fretboard/fretboard';
import { NOTE_NAMES_COMMON } from '../../core/pitch';

@Component({
  selector: 'app-chord-highlighter',
  standalone: true,
  templateUrl: './chord-highlighter.html',
  styleUrl: './chord-highlighter.scss'
})
export class ChordHighlighterComponent implements OnChanges {
  @Input() highlightSet: HighlightSet | null = null;
  @Input() spelling: readonly string[] = NOTE_NAMES_COMMON;
  @Input() canAddToProgression = false;

  @Output() chordPcsChanged    = new EventEmitter<{ pcs: Set<number>; label: string } | null>();
  @Output() chordSelected      = new EventEmitter<DiatonicChord | null>();
  @Output() addToProgression   = new EventEmitter<DiatonicChord>();

  readonly extensions: { value: ChordExtension; label: string }[] = [
    { value: 'power',   label: 'Power' },
    { value: 'triad',   label: 'Triad' },
    { value: 'seventh', label: 'Seventh' },
    { value: 'ninth',   label: 'Ninth' },
  ];

  chords: DiatonicChord[] = [];
  selectedChord: DiatonicChord | null = null;
  chordExtension: ChordExtension = 'triad';

  get isVisible(): boolean {
    return (this.highlightSet?.intervals.length ?? 0) >= 4 && !this.highlightSet?.strings;
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Only reset when the scale itself changes — not when canAddToProgression
    // flips (which also triggers ngOnChanges and would wipe selectedChord).
    if (!('highlightSet' in changes)) return;

    this.chords = [];
    this.selectedChord = null;
    if (!this.isVisible || !this.highlightSet) return;
    this.chords = getDiatonicChords(this.highlightSet.root, this.highlightSet.intervals, this.chordExtension, this.spelling);
  }

  selectExtension(extension: ChordExtension): void {
    if (this.chordExtension === extension || !this.highlightSet) return;

    this.chordExtension = extension;
    this.chords = getDiatonicChords(this.highlightSet.root, this.highlightSet.intervals, extension, this.spelling);

    if (this.selectedChord) {
      this.selectedChord = null;
      this.chordPcsChanged.emit(null);
      this.chordSelected.emit(null);
    }
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
