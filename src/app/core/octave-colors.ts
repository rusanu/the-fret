// Distinct color per octave for tinting the fretboard background behind each
// string/fret cell. Hue steps by the golden angle (~137.5°) per octave rather
// than walking a fixed palette, so any two octaves — however many are visible
// on a given tuning/fret range — land far apart on the color wheel instead of
// risking near-duplicate neighbors (e.g. teal next to blue).
const HUE_STEP = 137.5;
const SATURATION = 62;
const LIGHTNESS = 46;

export function octaveColor(octave: number): string {
  const hue = ((octave * HUE_STEP) % 360 + 360) % 360;
  return `hsl(${hue}, ${SATURATION}%, ${LIGHTNESS}%)`;
}
