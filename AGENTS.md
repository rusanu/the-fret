# AGENTS.md — The Fret

**The Fret** — an interactive visual guide to the guitar fretboard.

This document defines the **musical/guitar domain model, nomenclature, and taxonomy** for the project. It is the shared vocabulary a coding agent should use when planning data structures, APIs, and UI. It intentionally contains **no technical/implementation detail** — only domain facts and relationships. Treat the names below as canonical identifiers.

---

## 1. Core insight (read first)

Almost every feature reduces to one pattern:

> **A `PitchSet` (root + interval formula) projected onto the fretboard coordinate system, optionally filtered to a region, and rendered as a shape.**

Scales, arpeggios, and chords are all `PitchSet`s. CAGED positions, pentatonic boxes, and blues boxes are all `Region`s. "Movable" things (barre chords, scale boxes, triad grids) are **shapes**: templates anchored to a root that translate along the neck. Build the primitives once; the features are views over them.

---

## 2. Primitives

### 2.1 Fretboard
- **Strings**: numbered **1–6**. String **1 = thinnest/highest pitch (high E)**, string **6 = thickest/lowest (low E)**. (UI may draw 6 at top or bottom; keep numbering fixed in data.)
- **Frets**: integer positions; **fret 0 = open string (nut)**. Typically 0–24.
- **Coordinate**: a fretted note = `(string, fret)`.
- **Position / region**: a contiguous fret range, e.g. "around fret 5".

### 2.2 Tuning
- Default: **Standard EADGBE** (string 6→1: E A D G B E).
- Interval between adjacent strings is a **perfect 4th**, *except* G→B which is a **major 3rd**. This "B-string offset" distorts every shape that crosses the G–B boundary — the agent must account for it everywhere, not special-case it per feature.
- Support alternate tunings as data: **Drop D** (DADGBE), **Open G/D/E**, **DADGAD**, half/whole-step down, etc. A tuning = ordered list of 6 open-string pitches.
- **Capo**: a transposition offset (treat as a movable virtual nut).

### 2.3 Note / pitch
- **Pitch class**: 12 chromatic values (C, C#/Db, D, … B).
- **Enharmonic spelling** (C# vs Db) is **context-dependent on key**; store pitch class + chosen spelling separately.
- **Octave designation** optional but needed for ordering/audio.

### 2.4 Interval & scale degree
- **Semitone distance** 0–12 with names: P1, m2, M2, m3, M3, P4, TT (A4/d5), P5, m6, M6, m7, M7, P8.
- **Scale degree**: 1–7 with alterations (b3, #4, b5, #5, b7…) and **extensions** 9, 11, 13 (= 2/4/6 an octave up).
- Useful fretboard interval facts: octave, P4, P5, and M3 each have characteristic shapes; all shift by +1 fret when crossing the G–B boundary.

---

## 3. PitchSets

A `PitchSet` = **root pitch class + ordered interval formula** (semitones from root). This single type covers scales, arpeggios, and chords.

### 3.1 Scales (formula in semitones from root)
| Name | Aliases | Formula |
|---|---|---|
| Major | Ionian | 0 2 4 5 7 9 11 |
| Natural minor | Aeolian | 0 2 3 5 7 8 10 |
| Harmonic minor | | 0 2 3 5 7 8 11 |
| Melodic minor (asc.) | | 0 2 3 5 7 9 11 |
| Major pentatonic | | 0 2 4 7 9 |
| Minor pentatonic | | 0 3 5 7 10 |
| Minor blues | blues scale | 0 3 5 6 7 10 |
| Major blues | | 0 2 3 4 7 9 |

**Modes of the major scale** (same 7 notes, different root/degree set): Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian.
**Other scales** (lower priority): whole-tone, diminished (half-whole / whole-half), chromatic, modes of harmonic/melodic minor.

### 3.2 Chords (interval formula from root)
| Quality | Formula |
|---|---|
| Major triad | 0 4 7 |
| Minor triad | 0 3 7 |
| Diminished | 0 3 6 |
| Augmented | 0 4 8 |
| sus2 / sus4 | 0 2 7 / 0 5 7 |
| 6 / m6 | 0 4 7 9 / 0 3 7 9 |
| dom7 | 0 4 7 10 |
| maj7 | 0 4 7 11 |
| min7 | 0 3 7 10 |
| m7b5 (half-dim) | 0 3 6 10 |
| dim7 | 0 3 6 9 |
| minMaj7 | 0 3 7 11 |
| Extensions | add9, 9, 11, 13 (stack 9=14,11=17,13=21 mod-octave) |

### 3.3 Arpeggios
An arpeggio is the **same formula as its chord**, but rendered as a single-note scale-like shape rather than a stacked voicing. Reuse chord formulas; differ only in rendering/region intent.

---

## 4. Shapes & voicings

### 4.1 Fixed vs movable chords
- **Fixed (open) chords**: use open strings, anchored at the nut, not transposable by sliding (e.g. open C, A, G, E, D, Em, Am, Dm). Each is a concrete voicing.
- **Movable (barre/closed) chords**: no open strings; a shape that slides along the neck. Root fret determines the chord. Derived from open shapes (see CAGED).

### 4.2 Voicing
A **voicing** = a concrete set of `(string, fret)` per sounded string, plus muted/open markers, optional fingering, and which tone (root/3rd/5th/7th…) each note is. Multiple voicings exist per chord.

---

## 5. CAGED — the unifying grid

CAGED is the spine that links **chord shapes ↔ scale positions ↔ arpeggio shapes ↔ neck regions**. Model it once and reuse.

- **Five movable shapes**, named for the open chord they derive from: **C, A, G, E, D**.
- Any chord can be played in all five shapes; ascending the neck they always recur in the order **C → A → G → E → D → (C octave)**, interlocking so they tile the whole fretboard.
- **Primary root string per shape**: C→string 5, A→string 5, G→string 6, E→string 6, D→string 4. (Most-used barre shapes are **E** and **A** because they barre cleanly.)
- The same five positions also define **five scale "positions"** and **five arpeggio shapes** for a given key — i.e. CAGED is simultaneously a chord index and a scale/arpeggio index keyed to the same neck regions.

**Barre rule (drives the triad/region feature):** an open shape barred so its root sits at fret *N* on the shape's root string = the chord rooted at that note.
*Worked example (from the brief):* **Am around fret 5** → choose the shape whose root lands near fret 5 = **E/Em shape** (root on string 6); string 6 fret 5 = A → render the **Em-shape barre at fret 5 = A minor**. This is the general algorithm: `(chord, target region) → pick CAGED shape whose root falls in region → render`.

---

## 6. Triads

- **3-note chords** (formulas in §3.2). On guitar, played on **adjacent string sets**:
  - Set 1: strings 1-2-3 · Set 2: 2-3-4 · Set 3: 3-4-5 · Set 4: 4-5-6.
- **Inversions**: root position (root lowest), 1st inversion (3rd lowest), 2nd inversion (5th lowest). Each string set × inversion = one small movable shape; sliding it spells the triad up the neck.
- Triads are the skeleton of CAGED chords (CAGED shapes = triads + octave/3rd/5th doublings). Useful for "show the cleanest 3-note version in this region."

---

## 7. Regions / boxes ("fret groups")

Named, memorable sub-regions of a scale grid. All are **`Region` filters** over a `PitchSet`.

- **Pentatonic boxes**: 5 connecting positions (Box 1–5) of the major/minor pentatonic scale; Box 1 (minor) is the common "home" position.
- **Three-notes-per-string (3NPS) patterns**: 7 sliding patterns covering the major scale and its modes; alternative to CAGED scale positions.
- **Blues boxes — "House of Blues"** (extension shapes reached from the primary pentatonic box, used for soloing):
  - **B.B. King box ("BB box")**: major-pentatonic-derived shape centered on a **2nd-string root**, sits higher on the neck.
  - **Albert King box**: minor-pentatonic extension box.
  - Model these as named regions/overlays anchored relative to the pentatonic root, not as separate scales.

---

## 8. Harmonic context (for labeling & suggestions)

- **Diatonic harmony (major key)** triad qualities by degree: I maj, ii min, iii min, IV maj, V maj, vi min, vii° dim. (Minor key and 7th-chord variants analogous.)
- **Key / key signature**: governs note **spelling** and which chords/scales are "in key."
- **Chord–scale relationship**: which scales fit a chord (e.g. dom7 ↔ Mixolydian / blues). Drives "scales that work over this chord" features.
- **Circle of fifths**: key relationships; optional reference utility.

---

## 9. Naming conventions for the agent

- Use the canonical names above verbatim as identifiers (`minor_pentatonic`, `caged_E_shape`, `bb_box`, `string_set_2`, `dom7`).
- Distinguish: **PitchSet** (abstract, root + intervals) vs **Shape** (movable template) vs **Voicing/FretMapping** (concrete `(string,fret)` set) vs **Region** (fret-range filter, possibly named).
- Always carry the **tuning** with any fretboard mapping; never assume standard tuning downstream.
- Always handle the **G–B major-3rd offset** in shape/interval logic.

---

## 10. Feature → model mapping (sanity check)

| Brief feature | Built from |
|---|---|
| Scales & arpeggios | PitchSet (§3.1/3.3) + Region (§7) |
| CAGED system | §5 grid |
| Chords (fixed & movable) + component notes | Voicings (§4) + chord PitchSet tones (§3.2) |
| Triads in any region (Am @ fret 5 → Em-shape barre) | §6 triads + §5 barre rule |
| "House of blues" & other fret groups | §7 named Regions |

---

*Scope: domain reference only. Implementation choices (stack, rendering, audio, state) are deliberately out of scope and to be decided in the build plan.*
