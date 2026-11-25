/**
 * "Saucy Swing" — Kitchen Chaos. A swinging cooking-show jazz tune in F: walking upright bass, brushes and
 * ride cymbal, vibraphone melody.
 */
export const kitchen = {
  name: 'Saucy Swing',
  bpm: 132,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  swing: 0.33,
  volume: 1.15,
  chords: ['F6', 'D7', 'Gm7', 'C7', 'Am7 D7', 'Gm7 C7', 'F6 D7', 'Gm7 C7'],
  parts: [
    { inst: 'ride', vol: 0.9, pattern: 'X . . . x . x . X . . . x . x .' },
    { inst: 'hat', vol: 0.5, pattern: '. . . . x . . . . . . . x . . .' },
    { inst: 'brush', vol: 0.8, pattern: 'x . x . x . x . x . x . x . x .' },
    { inst: 'kick', vol: 0.35, pattern: 'x . . . . . . . x . . . . . . .' },
    { inst: 'upright', vol: 0.9, octave: 2, bass: 'R . . . 3 . . . 5 . . . ^ . . .' },
    { inst: 'vibes', vol: 0.45, octave: 4, chord: 'x . . . . . x . . . . . . . . .' },
    {
      inst: 'vibes',
      vol: 0.9,
      bars: [
        'A5 - C6 - D6 - C6 - A5 - F5 - - - . .',
        'F#5 - A5 - C6 - - - D6 - C6 - A5 - - -',
        'Bb5 - - - A5 - G5 - F5 - D5 - - - . .',
        'E5 - G5 - Bb5 - - - A5 - G5 - E5 - C5 -',
        'C6 - - - A5 - E5 - D6 - C6 - A5 - F#5 -',
        'G5 - Bb5 - D6 - - - C6 - Bb5 - G5 - E5 -',
        'F5 - A5 - C6 - D6 - F#5 - A5 - C6 - - -',
        'Bb5 - A5 - G5 - E5 - F5 - - - . . . .',
      ],
    },
  ],
};
