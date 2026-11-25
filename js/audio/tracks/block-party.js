/**
 * "808 Block Party" — Block Party. Hip hop trap in C minor at 140 BPM with a half-time groove:
 * a distorted 808 carrying the low end, a clap on beat 3, rolling hi-hats (r = 2 hits, 3 = triplet roll),
 * dark bells and a moody pad.
 */
export const hood = {
  name: '808 Block Party',
  bpm: 140,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  swing: 0,
  volume: 0.45,
  chords: ['Cm', 'Cm', 'Ab', 'G', 'Cm', 'Cm', 'Ab', 'G'],
  parts: [
    {
      inst: 'kick',
      vol: 0.9,
      pattern: [
        'X . . . . . . . . . x . . . . .',
        'X . . . . . . x . . x . . . . .',
        'X . . . . . . . . . x . . . . .',
        'X . . . . . . . . x . . x . . .',
      ],
    },
    { inst: 'clap', vol: 0.9, pattern: '. . . . . . . . X . . . . . . .' },
    { inst: 'snare', vol: 0.45, pattern: '. . . . . . . . x . . . . . . .' },
    {
      inst: 'trapHat',
      vol: 0.9,
      pattern: [
        'x . x . x . x . x . x . r r x .',
        'x . x . x r x . x . x . 3 . 3 3',
        'x . x . x . x . x . r r x . x .',
        'x . x r x . x r x . x . 3 3 r r',
      ],
    },
    {
      inst: 'openHat',
      vol: 0.7,
      pattern: ['. . . . . . . . . . . . . . . .', '. . . . . . . . . . . . . . x .'],
    },
    {
      inst: 'rim',
      vol: 0.35,
      pattern: ['. . . . . . . . . . . . . . . .', '. . . x . . . . . . . . . . . x'],
    },
    {
      inst: 'bass808',
      vol: 1,
      bars: [
        'C2 - - - - - - - - - C2 - Eb2 - - -',
        'C2 - - - - - - - - - G1 - - - Bb1 -',
        'Ab1 - - - - - - - - - Ab1 - C2 - - -',
        'G1 - - - - - - - G1 - - - B1 - D2 -',
        'C2 - - - - - - - - - C2 - Eb2 - - -',
        'C2 - - - - - - - - - C2 - G2 - F2 -',
        'Ab1 - - - - - - - - - Ab1 - C2 - - -',
        'G1 - - - - - - - . . G1 - G1 - G1 -',
      ],
    },
    { inst: 'pad', vol: 0.55, octave: 3, chord: 'x . . . . . . . . . . . . . . .' },
    {
      inst: 'bell',
      vol: 0.9,
      bars: [
        'G5 . Eb5 . C5 . . . G5 . Eb5 . C5 . D5 .',
        'Eb5 . D5 . C5 . . . Bb4 . . . G4 . . .',
        'Ab5 . Eb5 . C5 . . . Ab5 . G5 . Eb5 . C5 .',
        'B4 . D5 . G5 . . . F5 . . . D5 . B4 .',
        'G5 . Eb5 . C5 . . . G5 . Eb5 . C5 . D5 .',
        'Eb5 . D5 . C5 . . . G5 . . . F5 . Eb5 .',
        'Ab5 . Eb5 . C5 . . . Ab5 . G5 . Eb5 . C5 .',
        'G5 . . . F5 . D5 . B4 . . . . . . .',
      ],
    },
  ],
};
