import { Component } from '@angular/core';
import { FretboardComponent, HighlightSet } from './fretboard/fretboard';
import { RootSelectorComponent } from './controls/root-selector/root-selector';
import { PitchSetSelectorComponent } from './controls/pitch-set-selector/pitch-set-selector';

import { TuningSelectorComponent } from './controls/tuning-selector/tuning-selector';
import { ChordHighlighterComponent } from './controls/chord-highlighter/chord-highlighter';
import { ChordFinderComponent, ChordQuery } from './query/chord-finder/chord-finder';
import { FretboardPanelComponent, FretboardPanel } from './shared/fretboard-panel/fretboard-panel';
import { ProgressionPlayerComponent } from './progression/progression-player';
import { ProgressionItem } from './core/progression-item';
import { PitchSetDef, pitchesInSet } from './core/pitch-set';
import { findBestShape, findVoicing, Voicing, VoicingPosition } from './core/caged';
import { DiatonicChord } from './core/harmony';
import { computeRegions, Region } from './core/region';
import { NOTE_NAMES_COMMON, noteAt } from './core/pitch';
import { Tuning, STANDARD_TUNING, TUNING_PRESETS } from './core/tuning';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FretboardComponent, RootSelectorComponent, PitchSetSelectorComponent,
            TuningSelectorComponent, ChordHighlighterComponent,
            /*ChordFinderComponent, */ FretboardPanelComponent, ProgressionPlayerComponent],
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
  // Voicing computed from the chord highlighter selection (shown on main fretboard)
  activeChordVoicing: Voicing | null = null;

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
    this.selectedTuning = tuning;
    this.progressionItems = [];
    this.progressionActiveVoicing = null;
    this.activeChordVoicing = null;
    this.recomputeRegions();
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

  onAddChordHighlightToProgression(_chord: DiatonicChord): void {
    if (!this.activeChordVoicing) return;
    this.progressionItems = [...this.progressionItems,
      { id: `p${++this.nextProgressionId}`, voicing: this.activeChordVoicing }];
  }

  // ── Chord finder ────────────────────────────────────────────────────────

  onChordFind(query: ChordQuery): void {
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

  private resetChordHighlight(): void {
    this.activeHighlightedChord = null;
    this.chordHighlightPcs = null;
    this.chordHighlightLabel = null;
    this.activeChordVoicing = null;
  }

  private recomputeChordVoicing(): void {
    if (!this.activeHighlightedChord) {
      this.activeChordVoicing = null;
      return;
    }

    const region = this.activeRegion;
    // Use the center of the region as the anchor fret so the distance
    // calculation favours voicings inside the region rather than those near fret 0.
    const targetFret = region ? region.startFret : 0;

    // // Derive the CAGED shape from the region:
    // // – CAGED regions: extract shape letter from the id ('caged-a' → 'A')
    // // – Pentatonic boxes: map to corresponding CAGED shape (Box1=E, Box2=D, Box3=C, Box4=A, Box5=G)
    // //   This is the fundamental CAGED/pentatonic equivalence — each box occupies the same neck
    // //   region as its corresponding CAGED chord shape.
    // const PENT_TO_SHAPE: Record<string, string> = {
    //   'pent1': 'E', 'pent1h': 'E',
    //   'pent2': 'D', 'pent2h': 'D',
    //   'pent3': 'C', 'pent3h': 'C',
    //   'pent4': 'A', 'pent4h': 'A',
    //   'pent5': 'G', 'pent5h': 'G',
    // };
    // const cagedMatch = region?.id.match(/^caged-([a-g])/);
    // const shapeId    = cagedMatch
    //   ? cagedMatch[1].toUpperCase()
    //   : (region ? PENT_TO_SHAPE[region.id] : undefined);

    const shapeId = undefined;

    this.activeChordVoicing = this.activeRegion && this.selectedSetDef ? findVoicing(
        this.activeHighlightedChord.chordRootPc,
        this.activeHighlightedChord.intervals,
        this.activeHighlightedChord.name,
        this.activeRegion,
        this.selectedSetDef,
        this.selectedTuning) : null;

    // If the locked shape has no template for this chord quality (e.g. G-shape minor),
    // fall back to finding the nearest voicing of any shape near the same fret range.
    this.activeChordVoicing ??=
      findBestShape(
        this.activeHighlightedChord.chordRootPc,
        this.activeHighlightedChord.intervals,
        this.activeHighlightedChord.name,
        targetFret, this.selectedTuning, shapeId,
      ) ?? (shapeId ? findBestShape(
        this.activeHighlightedChord.chordRootPc,
        this.activeHighlightedChord.intervals,
        this.activeHighlightedChord.name,
        targetFret, this.selectedTuning,
      ) : null);
  }

  private recomputeRegions(): void {
    const prevId = this.activeRegion?.id ?? null;
    this.regions = 
      this.selectedRoot !== null &&
      this.selectedSetDef != null
      ? computeRegions(this.selectedRoot, this.selectedSetDef,  this.selectedTuning)
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

