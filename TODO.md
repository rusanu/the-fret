# Backlog / Future TODOs

Items discovered during development, not yet scheduled into an iteration.

---

## Scale / PitchSet Library

- **Cross-reference Major↔Ionian and Natural minor↔Aeolian in the selector** — These are the same
  intervals under different names. Both should appear in *both* the Scales and Modes groups, with
  labels that make the relationship explicit:
  - Scales group: `"Major (Ionian)"`, `"Natural minor (Aeolian)"`
  - Modes group: `"Ionian (Major)"`, `"Aeolian (Natural minor)"`
  The `PITCH_SET_LIBRARY` entries should stay deduplicated (one formula each); the selector UI
  synthesises the duplicate display entries from the same `PitchSetDef` object, so highlighting
  behaviour is identical regardless of which label the user picks.

---

## UX / Fretboard

- **Toggle note labels on/off** — Note labels on every fret are visually heavy and overwhelm the
  neck view. Add a show/hide toggle in the UI. The `FretboardComponent` already accepts
  `[showNoteLabels]` as an input; the AppComponent just needs a button wired to it.
  Consider making labels hidden by default once scale/chord highlighting (Iteration 2) lands,
  so the neck starts clean and labels are opt-in.
