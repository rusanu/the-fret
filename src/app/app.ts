import { Component } from '@angular/core';
import { FretboardComponent, HighlightSet } from './fretboard/fretboard';
import { RootSelectorComponent } from './controls/root-selector/root-selector';
import { PitchSetSelectorComponent } from './controls/pitch-set-selector/pitch-set-selector';
import { RegionSelectorComponent } from './controls/region-selector/region-selector';
import { TuningSelectorComponent } from './controls/tuning-selector/tuning-selector';
import { ChordHighlighterComponent } from './controls/chord-highlighter/chord-highlighter';
import { ChordFinderComponent, ChordQuery } from './query/chord-finder/chord-finder';
import { FretboardPanelComponent, FretboardPanel } from './shared/fretboard-panel/fretboard-panel';
import { ProgressionPlayerComponent } from './progression/progression-player';
import { ProgressionItem } from './core/progression-item';
import { PitchSetDef, pitchesInSet } from './core/pitch-set';
import { findBestShape, Voicing } from './core/caged';
import { DiatonicChord } from './core/harmony';
import { computeRegions, Region } from './core/region';
import { NOTE_NAMES_COMMON } from './core/pitch';
import { Tuning, STANDARD_TUNING, TUNING_PRESETS } from './core/tuning';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FretboardComponent, RootSelectorComponent, PitchSetSelectorComponent,
            RegionSelectorComponent, TuningSelectorComponent, ChordHighlighterComponent,
            ChordFinderComponent, FretboardPanelComponent, ProgressionPlayerComponent],
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
  chordHighlightLabel: string | null = null;
  activeHighlightedChord: DiatonicChord | null = null;

  chordNoResult = false;
  panels: FretboardPanel[] = [];

  progressionItems: ProgressionItem[] = [];
  progressionActiveVoicing: Voicing | null = null;
  private nextProgressionId = 0;
  private nextPanelId = 0;

  private static readonly CAGED_SHAPES = new Set(['C', 'A', 'G', 'E', 'D']);

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

  get canSave(): boolean { return this.highlightSet !== null; }

  // "Add to progression" from chord highlighter requires a specific region (not All Neck)
  get canAddChordHighlightToProgression(): boolean {
    return this.activeHighlightedChord !== null && this.activeRegion !== null;
  }

  // ── Root / scale / region / tuning ──────────────────────────────────────

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

  onTuningSelected(tuning: Tuning): void {
    this.selectedTuning = tuning;
    this.recomputeRegions();
  }

  // ── Chord highlighter ───────────────────────────────────────────────────

  onChordHighlighted(data: { pcs: Set<number>; label: string } | null): void {
    this.chordHighlightPcs = data?.pcs ?? null;
    this.chordHighlightLabel = data?.label ?? null;
  }

  onChordSelected(chord: DiatonicChord | null): void {
    this.activeHighlightedChord = chord;
  }

  onAddChordHighlightToProgression(chord: DiatonicChord): void {
    if (!this.activeRegion) return;
    const voicing = findBestShape(
      chord.chordRootPc, chord.intervals, chord.name,
      this.activeRegion.startFret, this.selectedTuning,
    );
    if (!voicing) return;
    this.progressionItems = [...this.progressionItems,
      { id: `p${++this.nextProgressionId}`, voicing }];
  }

  // ── Chord finder ────────────────────────────────────────────────────────

  onChordFind(query: ChordQuery): void {
    const shapeId = query.shapeId !== 'auto' ? query.shapeId : undefined;
    const voicing = findBestShape(query.rootPc, query.intervals, query.chordName, query.fret, this.selectedTuning, shapeId);
    if (!voicing) { this.chordNoResult = true; return; }
    this.chordNoResult = false;
    const rootName = NOTE_NAMES_COMMON[query.rootPc];
    const shapeTag = App.CAGED_SHAPES.has(voicing.shape) ? ` · ${voicing.shape}-shape` : '';
    this.panels = [{
      id: `panel-${++this.nextPanelId}`,
      title: `${rootName} ${query.chordName} near fret ${query.fret}${shapeTag}${this.tuningTag()}`,
      type: 'voicing',
      voicing,
      highlightSet: null,
      activeRegion: null,
      showNoteLabels: this.showNoteLabels,
      showDegrees: this.showDegrees,
      tuning: this.selectedTuning,
      chordHighlightPcs: null,
    }, ...this.panels];
  }

  // ── Panels ──────────────────────────────────────────────────────────────

  onSaveMain(): void {
    if (!this.highlightSet) return;
    const rootName   = NOTE_NAMES_COMMON[this.highlightSet.root];
    const scaleName  = this.selectedSetDef?.name ?? '';
    const regionName = this.activeRegion?.name ?? 'All neck';
    this.panels = [{
      id: `panel-${++this.nextPanelId}`,
      title: `${rootName} ${scaleName} · ${regionName}${this.chordHighlightLabel ? ` — ${this.chordHighlightLabel}` : ''}${this.tuningTag()}`,
      type: 'snapshot',
      voicing: null,
      highlightSet: { ...this.highlightSet },
      activeRegion: this.activeRegion ? { ...this.activeRegion } : null,
      showNoteLabels: this.showNoteLabels,
      showDegrees: this.showDegrees,
      tuning: this.selectedTuning,
      chordHighlightPcs: this.chordHighlightPcs,
    }, ...this.panels];
  }

  onRemovePanel(id: string): void {
    this.panels = this.panels.filter(p => p.id !== id);
  }

  onAddVoicingToProgression(voicing: Voicing): void {
    this.progressionItems = [...this.progressionItems,
      { id: `p${++this.nextProgressionId}`, voicing }];
  }

  // ── Progression ─────────────────────────────────────────────────────────

  onProgressionActiveVoicingChanged(v: Voicing | null): void {
    this.progressionActiveVoicing = v;
  }

  onRemoveProgressionItem(id: string): void {
    this.progressionItems = this.progressionItems.filter(i => i.id !== id);
    if (this.progressionItems.length === 0) this.progressionActiveVoicing = null;
  }

  onClearProgression(): void {
    this.progressionItems = [];
    this.progressionActiveVoicing = null;
  }

  // ── Private helpers ──────────────────────────────────────────────────────

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
