# The Fret

An interactive visual guide to the guitar fretboard.

![Deploy to GitHub Pages](https://github.com/rremus/the-fret/actions/workflows/deploy.yml/badge.svg)

**Live:** https://rusanu.com/the-fret/

---

## What it does

- Visualises the full guitar neck (standard EADGBE tuning, 24 frets)
- Highlights any scale, mode, or arpeggio across the entire neck
- Filters the view to a named fret region (pentatonic boxes 1–5, CAGED scale positions)
- Finds the best CAGED chord voicing near any fret (open chords, barre chords)
- Saves snapshots of the current neck view for side-by-side comparison

## Development

```bash
npm install
ng serve        # dev server at http://localhost:4200
ng build        # production build
```

## Stack

Angular 20 · standalone components · SVG rendering · no backend
