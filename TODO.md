# Backlog / Future TODOs

Items discovered during development, not yet scheduled into an iteration.

---

## UX / Fretboard

- **Toggle note labels on/off** — Note labels on every fret are visually heavy and overwhelm the
  neck view. Add a show/hide toggle in the UI. The `FretboardComponent` already accepts
  `[showNoteLabels]` as an input; the AppComponent just needs a button wired to it.
  Consider making labels hidden by default once scale/chord highlighting (Iteration 2) lands,
  so the neck starts clean and labels are opt-in.
