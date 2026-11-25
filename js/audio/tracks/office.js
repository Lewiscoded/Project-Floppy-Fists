/**
 * "Please Hold" — Office Meltdown. Smooth elevator / hold music: bossa rhythm, Rhodes chords, a lazy flute.
 */
export const office = {
  name: 'Please Hold',
  bpm: 96,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  swing: 0,
  volume: 0.7,
  chords: ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7', 'Fmaj7', 'Em7 A7', 'Dm7 G7', 'Cmaj7'],
  parts: [
    { inst: 'kick', vol: 0.55, pattern: 'x . . . . . x . x . . . . . x .' },
    { inst: 'rim', vol: 0.6, pattern: 'x . . x . . x . . . x . . x . .' },
    { inst: 'shaker', vol: 0.7, pattern: 'x x x x x x x x x x x x x x x x' },
    { inst: 'subBass', vol: 0.75, octave: 2, bass: 'R . . . . . 5 . R . . . . . 5 .' },
    { inst: 'rhodes', vol: 0.7, octave: 4, chord: 'x . . . . . x . . . x . . . . .' },
    {
      inst: 'flute',
      vol: 0.8,
      bars: [
        'E5 - - - - - - - C5 - D5 - E5 - - -',
        'G5 - - - - - - - D5 - E5 - G5 - - -',
        'F5 - - - E5 - D5 - C5 - - - A4 - - -',
        'B4 - - - - - - - . . . . . . . .',
        'A5 - - - G5 - - - E5 - - - C5 - - -',
        'D5 - E5 - G5 - - - C#5 - E5 - A5 - - -',
        'F5 - - - A5 - - - G5 - F5 - D5 - B4 -',
        'C5 - - - - - - - . . . . . . . .',
      ],
    },
  ],
};
