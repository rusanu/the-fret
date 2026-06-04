import { Component } from '@angular/core';
import { FretboardComponent, HighlightSet } from './fretboard/fretboard';
import { RootSelectorComponent } from './controls/root-selector/root-selector';
import { PitchSetSelectorComponent } from './controls/pitch-set-selector/pitch-set-selector';
import { PitchSetDef } from './core/pitch-set';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FretboardComponent, RootSelectorComponent, PitchSetSelectorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  selectedRoot: number | null = null;
  selectedSetDef: PitchSetDef | null = null;

  showNoteLabels = false;
  showDegrees = false;
  dimUnset = true;

  // Only assigned when both root and set are chosen, so fretboard rebuild fires only then
  highlightSet: HighlightSet | null = null;

  onRootSelected(root: number | null): void {
    this.selectedRoot = root;
    this.syncHighlightSet();
  }

  onSetSelected(def: PitchSetDef | null): void {
    this.selectedSetDef = def;
    this.syncHighlightSet();
  }

  private syncHighlightSet(): void {
    if (this.selectedRoot !== null && this.selectedSetDef !== null) {
      this.highlightSet = { root: this.selectedRoot, intervals: this.selectedSetDef.intervals };
    } else {
      this.highlightSet = null;
    }
  }
}
