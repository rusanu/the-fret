# Backlog / Future TODOs

Items discovered during development, not yet scheduled into an iteration.

- the angular README needs to be replaced with an actual readme. 
    - point to https://rusanu.com/the-fret/ as the current deployed live page
    - include github actions build status 
    - should not detail the how-to-use-the-site because it will only go out-of-sync
    - TODO: provide some screenshots 
- remove the Dim unset toggle. should be just always on (dim)
- the chord finder should not split the root/scale/region and main fretboard. I say it should be bellow the main fretboard
- the "save snapshot" should be right next to the main fretboard, not in the root/region/toggles pane
- the Find chord should allow you to select the tonic irrespective of what is selected for the main fretboard
- the find chord should allow more chord types. Not only major/min triads, but allow also 5 (power chords), plus all the chords displayed in "arpeggios" (it should be the same source for both arpeggions and find chord, and arpeggios should include power chords, as ridicoulous as a 2 note arpeggio sounds)
- the blues modes regions are difficult to explain. Hide them from the UX options (keep the code)
- reverse chord finder. click on fretboard to indicate fretted strings (including muted), show the resulting chord name (if any). Like AmpleGuitar strummer does.
- possible chord fingering suggestion. complicated because of barre posibilities, max number of fingers in a fret depends on fret physical width, difficult to model physical limitations like reach
- chord finder should have also a CAGED shape mode ("find Gm in A shape").
- there should be a "chord highlighter" feature. When the main fretboard is showing a scale/region, I should be able to select and highlight any chord *in the selected root/scale and region*. posibly display a dropdown of all possible triads (+7 too?) with the notes in the shown scale/region, must show as absolute (C/Cm etc) but maybe also as I,II, IV etc *in the selected root and scale*. 

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
  - Audio can be layered on top later once the audio engine exists, but is not a blocker.
