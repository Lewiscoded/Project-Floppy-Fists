/**
 * "Floppy Fists Theme" — the main menu, lobby and results music.
 * Bouncy, cheerful pop in C major. See audio/music.js for how songs are written.
 */
export const menu = {
  name: 'Floppy Fists Theme',
  bpm: 116,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  swing: 0.1,
  volume: 0.9,
  chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'F G', 'C'],
  parts: [
    { inst: 'kick', vol: 0.9, pattern: 'X . . . . . x . X . . . . . . .' },
    { inst: 'snare', vol: 0.7, pattern: '. . . . X . . . . . . . X . . x' },
    { inst: 'hat', vol: 0.8, pattern: '. . x . . . x . . . x . . . x .' },
    { inst: 'shaker', vol: 0.6, pattern: 'x x x x x x x x x x x x x x x x' },
    { inst: 'synthBass', vol: 0.75, octave: 2, bass: 'R . . R . . 5 . R . . R . 5 8 .' },
    { inst: 'pluck', vol: 0.55, octave: 4, chord: '. . x . . . x . . . x . . . x .' },
    {
      inst: 'squareLead',
      vol: 0.8,
      bars: [
        'E5 - G5 - C6 - - - B5 - G5 - E5 - - -',
        'A5 - - - G5 - E5 - C5 - D5 - E5 - - -',
        'F5 - A5 - C6 - - - A5 - F5 - C5 - - -',
        'D5 - - - E5 - F5 - G5 - - - - - . .',
        'E5 - G5 - C6 - - - D6 - C6 - B5 - G5 -',
        'A5 - - - C6 - B5 - A5 - G5 - E5 - - -',
        'F5 - A5 - G5 - F5 - E5 - D5 - B4 - D5 -',
        'C5 - - - - - - - . . . . G4 - B4 -',
      ],
    },
  ],
};
