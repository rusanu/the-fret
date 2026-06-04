import { Component } from '@angular/core';
import { FretboardComponent, HighlightSet } from './fretboard/fretboard';
import { RootSelectorComponent } from './controls/root-selector/root-selector';
import { PitchSetSelectorComponent } from './controls/pitch-set-selector/pitch-set-selector';
import { RegionSelectorComponent } from './controls/region-selector/region-selector';
import { TuningSelectorComponent } from './controls/tuning-selector/tuning-selector';
import { ChordHighlighterComponent } from './controls/chord-highlighter/chord-highlighter';
import { ChordFinderComponent, ChordQuery } from './query/chord-finder/chord-finder';
import { FretboardPanelComponent, FretboardPanel } from './shared/fretboard-panel/fretboard-panel';
import { PitchSetDef, pitchesInSet } from './core/pitch-set';
import { findBestShape } from './core/caged';
import { computeRegions, Region } from './core/region';
import { NOTE_NAMES_COMMON } from './core/pitch';
import { Tuning, STANDARD_TUNING, TUNING_PRESETS } from './core/tuning';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FretboardComponent, RootSelectorComponent, PitchSetSelectorComponent,
            RegionSelectorComponent, TuningSelectorComponent, ChordHighlighterComponent,
            ChordFinderComponent, FretboardPanelComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  selectedRoot: number | null = null;
  selectedSetDef: PitchSetDef | null = null;
  selectedTuning: Tuning = STANDARD_TUNING;

  labelMode: 'notes' | 'degrees' = 'notes';

  readonly showNoteLabels = true;
  get showDegrees(): boolean { return this.labelMode === 'degrees'; }

  highlightSet: HighlightSet | null = null;
  regions: Region[] = [];
  activeRegion: Region | null = null;

  chordHighlightPcs: Set<number> | null = null;
  panels: FretboardPanel[] = [];
  private nextId = 0;

  private static readonly CAGED_SHAPES = new Set(['C', 'A', 'G', 'E', 'D']);

  // Returns " [Drop D]" etc. when tuning is non-standard; empty string for standard.
  private tuningTag(): string {
    if (this.selectedTuning === STANDARD_TUNING) return '';
    const preset = TUNING_PRESETS.find(p => p.strings === this.selectedTuning);
    const shortName = preset ? preset.name.split(' — ')[0] : 'Custom';
    return ` [${shortName}]`;
  }

  get inSetPcs(): Set<number> {
    if (!this.highlightSet) return new Set();
    return pitchesInSet(this.highlightSet.root, this.highlightSet.intervals);
  }

  get canSave(): boolean {
    return this.highlightSet !== null;
  }

  onRootSelected(root: number | null): void {
    this.selectedRoot = root;
    this.recomputeRegions();
    this.syncHighlightSet();
  }

  onSetSelected(def: PitchSetDef | null): void {
    this.selectedSetDef = def;
    this.syncHighlightSet();
  }

  onRegionSelected(region: Region | null): void {
    this.activeRegion = region;
  }

  onChordHighlighted(pcs: Set<number> | null): void {
    this.chordHighlightPcs = pcs;
  }

  onTuningSelected(tuning: Tuning): void {
    this.selectedTuning = tuning;
    this.recomputeRegions();
  }

  onChordFind(query: ChordQuery): void {
    const shapeId = query.shapeId !== 'auto' ? query.shapeId : undefined;
    const voicing = findBestShape(query.rootPc, query.intervals, query.chordName, query.fret, this.selectedTuning, shapeId);
    if (!voicing) return;
    const rootName = NOTE_NAMES_COMMON[query.rootPc];
    const shapeTag = App.CAGED_SHAPES.has(voicing.shape) ? ` · ${voicing.shape}-shape` : '';
    this.panels = [{
      id: `panel-${++this.nextId}`,
      title: `${rootName} ${query.chordName} near fret ${query.fret}${shapeTag}${this.tuningTag()}`,
      type: 'voicing',
      voicing,
      highlightSet: null,
      activeRegion: null,
      showNoteLabels: this.showNoteLabels,
      showDegrees: this.showDegrees,
      tuning: this.selectedTuning,
    }, ...this.panels];
  }

  onSaveMain(): void {
    if (!this.highlightSet) return;
    const rootName   = NOTE_NAMES_COMMON[this.highlightSet.root];
    const scaleName  = this.selectedSetDef?.name ?? '';
    const regionName = this.activeRegion?.name ?? 'All neck';
    this.panels = [{
      id: `panel-${++this.nextId}`,
      title: `${rootName} ${scaleName} · ${regionName}${this.tuningTag()}`,
      type: 'snapshot',
      voicing: null,
      highlightSet: { ...this.highlightSet },
      activeRegion: this.activeRegion ? { ...this.activeRegion } : null,
      showNoteLabels: this.showNoteLabels,
      showDegrees: this.showDegrees,
      tuning: this.selectedTuning,
    }, ...this.panels];
  }

  onRemovePanel(id: string): void {
    this.panels = this.panels.filter(p => p.id !== id);
  }

  private recomputeRegions(): void {
    const prevId = this.activeRegion?.id ?? null;
    this.regions = this.selectedRoot !== null
      ? computeRegions(this.selectedRoot, this.selectedTuning)
      : [];
    this.activeRegion = prevId ? (this.regions.find(r => r.id === prevId) ?? null) : null;
  }

  private syncHighlightSet(): void {
    if (this.selectedRoot !== null && this.selectedSetDef !== null) {
      this.highlightSet = { root: this.selectedRoot, intervals: this.selectedSetDef.intervals };
    } else {
      this.highlightSet = null;
    }
  }
}
