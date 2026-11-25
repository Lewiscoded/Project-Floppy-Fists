/**
 * "Corner Store Cypher" — Block Party. A laid-back boom bap beat in A minor: dusty drums, sub bass,
 * piano stabs, a whistled hook and some vinyl crackle.
 */
export const hood = {
  name: 'Corner Store Cypher',
  bpm: 88,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  swing: 0.2,
  volume: 0.72,
  chords: ['Am7', 'Am7', 'Fmaj7', 'E7', 'Am7', 'Am7', 'Dm7', 'E7'],
  parts: [
    { inst: 'kick', vol: 1, pattern: 'X . . . . . . x . . x . . . . .' },
    { inst: 'snare', vol: 0.85, pattern: '. . . . X . . . . . . . X . . .' },
    { inst: 'clap', vol: 0.5, pattern: '. . . . x . . . . . . . x . . .' },
    { inst: 'hat', vol: 0.9, pattern: 'x . x . x . x . x . x . x . . .' },
    { inst: 'openHat', vol: 0.8, pattern: '. . . . . . . . . . . . . . x .' },
    {
      inst: 'crackle',
      vol: 1,
      pattern: ['x . . . . . . x . . . . . x . .', '. . . x . . . . . . x . . . . .'],
    },
    { inst: 'subBass', vol: 0.9, octave: 2, bass: 'R . . . . . . R . . R . . . . .' },
    { inst: 'piano', vol: 0.55, octave: 4, chord: 'x . . x . . . . . . x . . . . .' },
    {
      inst: 'whistle',
      vol: 0.85,
      bars: [
        'E5 - - - . . G5 - A5 - - - . . . .',
        'C6 - B5 - A5 - - - G5 - E5 - - - . .',
        'A5 - - - . . C6 - . . A5 - G5 - - -',
        'G#5 - - - - - - - B5 - - - - - . .',
        'E5 - - - . . G5 - A5 - - - C6 - - -',
        'D6 - C6 - A5 - - - G5 - A5 - - - . .',
        'F5 - - - A5 - - - C6 - - - D6 - - -',
        'B5 - - - G#5 - - - E5 - - - - - . .',
      ],
    },
  ],
};
