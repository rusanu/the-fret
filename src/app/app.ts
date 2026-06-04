import { Component } from '@angular/core';
import { FretboardComponent, HighlightSet } from './fretboard/fretboard';
import { RootSelectorComponent } from './controls/root-selector/root-selector';
import { PitchSetSelectorComponent } from './controls/pitch-set-selector/pitch-set-selector';
import { RegionSelectorComponent } from './controls/region-selector/region-selector';
import { ChordFinderComponent, ChordQuery } from './query/chord-finder/chord-finder';
import { FretboardPanelComponent, FretboardPanel } from './shared/fretboard-panel/fretboard-panel';
import { PitchSetDef } from './core/pitch-set';
import { findBestShape } from './core/caged';
import { pitchesInSet } from './core/pitch-set';
import { computeRegions, Region } from './core/region';
import { NOTE_NAMES_COMMON } from './core/pitch';
import { STANDARD_TUNING } from './core/tuning';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FretboardComponent, RootSelectorComponent, PitchSetSelectorComponent,
            RegionSelectorComponent, ChordFinderComponent, FretboardPanelComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  selectedRoot: number | null = null;
  selectedSetDef: PitchSetDef | null = null;

  labelMode: 'notes' | 'degrees' = 'notes';

  readonly showNoteLabels = true;
  get showDegrees(): boolean { return this.labelMode === 'degrees'; }

  highlightSet: HighlightSet | null = null;
  regions: Region[] = [];
  activeRegion: Region | null = null;

  panels: FretboardPanel[] = [];
  private nextId = 0;

  get inSetPcs(): Set<number> {
    if (!this.highlightSet) return new Set();
    return pitchesInSet(this.highlightSet.root, this.highlightSet.intervals);
  }

  get canSave(): boolean {
    return this.highlightSet !== null;
  }

  onRootSelected(root: number | null): void {
    this.selectedRoot = root;
    const prevId = this.activeRegion?.id ?? null;
    this.regions = root !== null ? computeRegions(root, STANDARD_TUNING) : [];
    this.activeRegion = prevId ? (this.regions.find(r => r.id === prevId) ?? null) : null;
    this.syncHighlightSet();
  }

  onSetSelected(def: PitchSetDef | null): void {
    this.selectedSetDef = def;
    this.syncHighlightSet();
  }

  onRegionSelected(region: Region | null): void {
    this.activeRegion = region;
  }

  onChordFind(query: ChordQuery): void {
    const voicing = findBestShape(query.rootPc, query.intervals, query.chordName, query.fret, STANDARD_TUNING);
    if (!voicing) return;
    const rootName = NOTE_NAMES_COMMON[query.rootPc];
    this.panels = [{
      id: `panel-${++this.nextId}`,
      title: `${rootName} ${query.chordName} near fret ${query.fret}`,
      type: 'voicing',
      voicing,
      highlightSet: null,
      activeRegion: null,
      showNoteLabels: this.showNoteLabels,
      showDegrees: this.showDegrees,
    }, ...this.panels];
  }

  onSaveMain(): void {
    if (!this.highlightSet) return;
    const rootName   = NOTE_NAMES_COMMON[this.highlightSet.root];
    const scaleName  = this.selectedSetDef?.name ?? '';
    const regionName = this.activeRegion?.name ?? 'All neck';
    this.panels = [{
      id: `panel-${++this.nextId}`,
      title: `${rootName} ${scaleName} · ${regionName}`,
      type: 'snapshot',
      voicing: null,
      highlightSet: { ...this.highlightSet },
      activeRegion: this.activeRegion ? { ...this.activeRegion } : null,
      showNoteLabels: this.showNoteLabels,
      showDegrees: this.showDegrees,
    }, ...this.panels];
  }

  onRemovePanel(id: string): void {
    this.panels = this.panels.filter(p => p.id !== id);
  }

  private syncHighlightSet(): void {
    if (this.selectedRoot !== null && this.selectedSetDef !== null) {
      this.highlightSet = { root: this.selectedRoot, intervals: this.selectedSetDef.intervals };
    } else {
      this.highlightSet = null;
    }
  }
}
