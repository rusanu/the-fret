# Backlog / Future TODOs

Items discovered during development, not yet scheduled into an iteration.

---

## Chord Finder

- **Reverse chord finder** — click fretboard strings to indicate fretted/muted positions,
  show the resulting chord name (if any). Like AmpleGuitar strummer does.
- **Chord fingering suggestions** — complicated because of barre possibilities, max fingers
  per fret depends on physical fret width, difficult to model reach constraints.

---

## Features

- **Lick / solo mode** — enter a note sequence (e.g. C-E-G-F-D-A), show the voicings
  across regions (frets 1–5, 6–10, 11–…). Possibly "move it up 5 frets". TBD how to
  handle absolute pitch (A3 vs A4 vs A5).

---

## v.next — Major Features (separate milestone, not iteratively addable)

- **Audio / Sound emission** — Play individual notes, chords, and scale runs through the browser.
  This is a foundational capability that unlocks everything else (chord progressions, ear training,
  metronome sync). Key design decisions to resolve before building:
  - Engine: Web Audio API (synthesis) vs. sampled audio (e.g. guitar samples via SFZ/Soundfont).
    Samples sound more realistic; synthesis is smaller bundle but sounds synthetic.
  - Latency: Web Audio scheduling must use `AudioContext.currentTime` + lookahead buffering to
    avoid jank, especially on mobile WebView.
  - Note model: need octave information (currently `PitchClass` is 0–11 with no octave), so
    `noteAt()` must be extended to return absolute MIDI note number (= octave × 12 + pitchClass).
    String 6 open E = MIDI 40 (E2). The fretboard already has all the data to compute this.
  - Touch/click to play: tap a note dot → hear that note. Tap a voicing dot → hear the chord.
  - Future: metronome, loop, MIDI output.

- **Chord progressions with animation** — Show a named progression (e.g. Am I–VI–IV–V) as a
  timed animated sequence on the fretboard, one chord per bar at a configurable BPM.
  Purely visual — no audio required. Depends only on Iteration 4 (voicing engine / CAGED chord
  shapes), which provides the fingering positions for each chord.
  Key design decisions:
  - Progression input: Roman-numeral picker (I ii iii IV V vi vii°) relative to the selected key,
    or a free-form chord sequence (Am → F → C → G).
  - Animation: a "playhead" cycles through chords at the set BPM using `setInterval` or
    `requestAnimationFrame`; active chord's voicing dots highlight on the neck, others dim.
  - BPM control: tap-tempo or numeric input; default 80 BPM, 1 chord per bar.
  - Region awareness: show each chord in the selected box/region (e.g. "all in Box 1") or
    in the closest CAGED shape to the previous chord (voice-leading mode).
  - To be a useful feature (ie. play along) user needs a preview of the next chord to prepare for the change. So the play needs to render the current chord but also the next chord coming up. A "mini fretboard" view that shows only the relevant portion of the neck (4-5 frets, and also probably about 25% size ie. 1/2 height 1/2 width).1 or 2 small mini frets show the upcoming 1-2 chords and main fretboard show the current chord. On beat they change.
  - Audio can be layered on top later once the audio engine exists, but is not a blocker.
