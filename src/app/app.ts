import { Component } from '@angular/core';
import { FretboardComponent, HighlightSet } from './fretboard/fretboard';
import { RootSelectorComponent } from './controls/root-selector/root-selector';
import { CircleOfFifthsSelectorComponent } from './controls/circle-of-fifths-selector/circle-of-fifths-selector';
import { PitchSetSelectorComponent } from './controls/pitch-set-selector/pitch-set-selector';

import { TuningSelectorComponent } from './controls/tuning-selector/tuning-selector';
import { ChordHighlighterComponent } from './controls/chord-highlighter/chord-highlighter';
import { ChordFinderComponent, ChordQuery } from './query/chord-finder/chord-finder';
import { FretboardPanelComponent, FretboardPanel } from './shared/fretboard-panel/fretboard-panel';
import { ProgressionPlayerComponent } from './progression/progression-player';
import { ProgressionItem } from './core/progression-item';
import { PitchSetDef, pitchesInSet } from './core/pitch-set';
import { findVoicing, findVoicings, Voicing, VoicingPosition } from './core/voicing';
import { DiatonicChord } from './core/harmony';
import { computeRegions, Region } from './core/region';
import { NOTE_NAMES_COMMON, getScaleSpelling, noteAt } from './core/pitch';
import { Tuning, STANDARD_TUNING, TUNING_PRESETS, GuitarSetup, DEFAULT_SETUP } from './core/tuning';
import { CapoSelectorComponent } from './controls/capo-selector/capo-selector';
import { MiniVoicingComponent } from './shared/mini-voicing/mini-voicing';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FretboardComponent, RootSelectorComponent, CircleOfFifthsSelectorComponent, PitchSetSelectorComponent,
            TuningSelectorComponent, CapoSelectorComponent, ChordHighlighterComponent,
            /*ChordFinderComponent, */ FretboardPanelComponent, ProgressionPlayerComponent,
            MiniVoicingComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  selectedRoot: number | null = null;
  selectedSetDef: PitchSetDef | null = null;
  selectedSetup: GuitarSetup = DEFAULT_SETUP;

  get selectedTuning(): Tuning { return this.selectedSetup.tuning; }
  get selectedCapo(): number { return this.selectedSetup.capo; }

  labelMode: 'notes' | 'degrees' = 'notes';
  rootSelectorView: 'linear' | 'circle' = 'linear';

  readonly showNoteLabels = true;
  get showDegrees(): boolean { return this.labelMode === 'degrees'; }

  highlightSet: HighlightSet | null = null;
  regions: Region[] = [];
  activeRegion: Region | null = null;

  chordHighlightPcs: Set<number> | null = null;
  chordHighlightLabel: string | null = null;
  activeHighlightedChord: DiatonicChord | null = null;
  // Voicing computed from the chord highlighter selection (shown on main fretboard)
  activeChordVoicing: Voicing | null = null;

  showVoicingChoices = false;
  voicingChoices: Voicing[] = [];
  selectedVoicingIndex = -1;

  chordNoResult = false;
  panels: FretboardPanel[] = [];

  progressionItems: ProgressionItem[] = [];
  // Voicing from the progression player (takes priority over activeChordVoicing)
  progressionActiveVoicing: Voicing | null = null;
  private nextProgressionId = 0;
  private nextPanelId = 0;

  private static readonly CAGED_SHAPES = new Set(['C', 'A', 'G', 'E', 'D']);

  // The voicing currently shown on the main fretboard.
  // Progression playback takes priority; chord-highlighter selection is the fallback.
  get mainVoicing(): Voicing | null {
    return this.progressionActiveVoicing ?? this.activeChordVoicing;
  }

  private tuningTag(): string {
    const parts: string[] = [];
    if (this.selectedTuning !== STANDARD_TUNING) {
      const preset = TUNING_PRESETS.find(p => p.strings === this.selectedTuning);
      parts.push(preset ? preset.name.split(' — ')[0] : 'Custom');
    }
    if (this.selectedCapo > 0) {
      parts.push(`Capo ${this.selectedCapo}`);
    }
    return parts.length ? ` [${parts.join(', ')}]` : '';
  }

  get inSetPcs(): Set<number> {
    if (!this.highlightSet) return new Set();
    return pitchesInSet(this.highlightSet.root, this.highlightSet.intervals);
  }

  get canSave(): boolean { return this.highlightSet !== null; }

  get scaleSpelling(): readonly string[] {
    return this.highlightSet
      ? getScaleSpelling(this.highlightSet.root, this.highlightSet.intervals)
      : NOTE_NAMES_COMMON;
  }

  // Null until a scale is selected, so root selectors keep showing dual
  // "C#/Db"-style labels until there's scale context to disambiguate them.
  get rootSpelling(): readonly string[] | null {
    return this.highlightSet ? this.scaleSpelling : null;
  }

  get canAddChordHighlightToProgression(): boolean {
    return this.activeChordVoicing !== null;
  }

  // ── Root / scale / region / tuning ──────────────────────────────────────

  onRootSelected(root: number | null): void {
    this.selectedRoot = root;
    this.resetChordHighlight();
    this.progressionActiveVoicing = null;
    this.recomputeRegions();
    this.syncHighlightSet();
  }

  onSetSelected(def: PitchSetDef | null): void {
    this.selectedSetDef = def;
    this.recomputeRegions();
    this.resetChordHighlight();
    this.progressionActiveVoicing = null;
    this.syncHighlightSet();
  }

  onRegionSelected(region: Region | null): void {
    this.activeRegion = region;
    this.progressionActiveVoicing = null;
    this.recomputeChordVoicing();
  }

  onTuningSelected(tuning: Tuning): void {
    this.selectedSetup = { ...this.selectedSetup, tuning };
    this.progressionItems = [];
    this.progressionActiveVoicing = null;
    this.activeChordVoicing = null;
    this.recomputeRegions();
  }

  onCapoChanged(capo: number): void {
    this.selectedSetup = { ...this.selectedSetup, capo };
    this.progressionItems = [];
    this.progressionActiveVoicing = null;
    this.activeChordVoicing = null;
    this.recomputeRegions();
    this.recomputeChordVoicing();
  }

  // ── Chord highlighter ───────────────────────────────────────────────────

  onChordHighlighted(data: { pcs: Set<number>; label: string } | null): void {
    this.chordHighlightPcs = data?.pcs ?? null;
    this.chordHighlightLabel = data?.label ?? null;
  }

  onChordSelected(chord: DiatonicChord | null): void {
    this.activeHighlightedChord = chord;
    this.recomputeChordVoicing();
  }

  toggleVoicingChoices(): void {
    this.showVoicingChoices = !this.showVoicingChoices;
    this.selectedVoicingIndex = -1;
    this.recomputeChordVoicing();
  }

  selectVoicingChoice(index: number): void {
    this.selectedVoicingIndex = index;
    this.activeChordVoicing = this.voicingChoices[index] ?? null;
  }

  onAddChordHighlightToProgression(_chord: DiatonicChord): void {
    if (!this.activeChordVoicing) return;
    this.progressionItems = [...this.progressionItems,
      { id: `p${++this.nextProgressionId}`, voicing: this.activeChordVoicing }];
  }

  // ── Chord finder ────────────────────────────────────────────────────────

  onChordFind(query: ChordQuery): void {
    /*
    const shapeId = query.shapeId !== 'auto' ? query.shapeId : undefined;
    const voicing = findBestShape(query.rootPc, query.intervals, query.chordName, query.fret, this.selectedTuning, shapeId);
    if (!voicing) { this.chordNoResult = true; return; }
    this.chordNoResult = false;
    const rootName = NOTE_NAMES_COMMON[query.rootPc];
    const shapeTag = voicing?.shape && App.CAGED_SHAPES.has(voicing.shape) ? ` · ${voicing.shape}-shape` : '';
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
      capo: this.selectedCapo,
      chordHighlightPcs: null,
    }, ...this.panels];
    */
  }

  // ── Panels ──────────────────────────────────────────────────────────────

  onSaveMain(): void {
    if (!this.highlightSet) return;
    const rootName   = this.scaleSpelling[this.highlightSet.root];
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
      capo: this.selectedCapo,
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

  private resetChordHighlight(): void {
    this.activeHighlightedChord = null;
    this.chordHighlightPcs = null;
    this.chordHighlightLabel = null;
    this.activeChordVoicing = null;
    this.voicingChoices = [];
    this.selectedVoicingIndex = -1;
  }

  private recomputeChordVoicing(): void {
    if (!this.activeHighlightedChord) {
      this.activeChordVoicing = null;
      this.voicingChoices = [];
      this.selectedVoicingIndex = -1;
      return;
    }

    const region = this.activeRegion ?? {
      startFret: this.selectedCapo,
      endFret: this.selectedCapo + 4,
      id: 'open',
      name: 'Open',
      shortLabel: 'open',
      group: 'caged' as const
    };

    if (!this.selectedSetDef) {
      this.activeChordVoicing = null;
      this.voicingChoices = [];
      this.selectedVoicingIndex = -1;
      return;
    }

    if (this.showVoicingChoices) {
      this.voicingChoices = findVoicings(
        this.activeHighlightedChord.chordRootPc,
        this.activeHighlightedChord.intervals,
        this.activeHighlightedChord.name,
        region,
        this.selectedSetDef,
        this.selectedSetup);
      this.selectedVoicingIndex = this.voicingChoices.length > 0 ? 0 : -1;
      this.activeChordVoicing = this.voicingChoices[0] ?? null;
    } else {
      this.voicingChoices = [];
      this.selectedVoicingIndex = -1;
      this.activeChordVoicing = findVoicing(
        this.activeHighlightedChord.chordRootPc,
        this.activeHighlightedChord.intervals,
        this.activeHighlightedChord.name,
        region,
        this.selectedSetDef,
        this.selectedSetup);
    }
  }

  private recomputeRegions(): void {
    const prevId = this.activeRegion?.id ?? null;
    this.regions = 
      this.selectedRoot !== null &&
      this.selectedSetDef != null
      ? computeRegions(this.selectedRoot, this.selectedSetDef, this.selectedSetup)
      : [];
    this.activeRegion = prevId ? (this.regions.find(r => r.id === prevId) ?? null) : null;
  }

  private syncHighlightSet(): void {
    if (this.selectedRoot !== null && this.selectedSetDef !== null) {
      this.highlightSet = { root: this.selectedRoot, intervals: this.selectedSetDef.intervals, strings: this.selectedSetDef.strings };
    } else {
      this.highlightSet = null;
    }
  }
}

