import { Component } from '@angular/core';
import { FretboardComponent, HighlightSet } from './fretboard/fretboard';
import { RootSelectorComponent } from './controls/root-selector/root-selector';
import { PitchSetSelectorComponent } from './controls/pitch-set-selector/pitch-set-selector';
import { RegionSelectorComponent } from './controls/region-selector/region-selector';
import { PitchSetDef } from './core/pitch-set';
import { computeRegions, Region } from './core/region';
import { STANDARD_TUNING } from './core/tuning';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FretboardComponent, RootSelectorComponent, PitchSetSelectorComponent, RegionSelectorComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  selectedRoot: number | null = null;
  selectedSetDef: PitchSetDef | null = null;

  showNoteLabels = false;
  showDegrees = false;
  dimUnset = true;

  highlightSet: HighlightSet | null = null;
  regions: Region[] = [];
  activeRegion: Region | null = null;

  onRootSelected(root: number | null): void {
    this.selectedRoot = root;
    this.regions = root !== null ? computeRegions(root, STANDARD_TUNING) : [];
    this.activeRegion = null; // reset when root changes
    this.syncHighlightSet();
  }

  onSetSelected(def: PitchSetDef | null): void {
    this.selectedSetDef = def;
    this.syncHighlightSet();
  }

  onRegionSelected(region: Region | null): void {
    this.activeRegion = region;
  }

  private syncHighlightSet(): void {
    if (this.selectedRoot !== null && this.selectedSetDef !== null) {
      this.highlightSet = { root: this.selectedRoot, intervals: this.selectedSetDef.intervals };
    } else {
      this.highlightSet = null;
    }
  }
}
