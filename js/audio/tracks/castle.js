/**
 * "Jester's Jig" — Castle Siege. A bouncy jig in D dorian (12 steps per bar for that 6/8 lilt):
 * lute arpeggios, a drone, frame drum and tambourine, and a flute tune.
 */
export const medieval = {
  name: "Jester's Jig",
  bpm: 100,
  stepsPerBeat: 3,
  stepsPerBar: 12,
  swing: 0,
  volume: 1.8,
  chords: ['Dm', 'C', 'Dm', 'Am', 'Dm', 'C', 'Bb C', 'Dm'],
  parts: [
    { inst: 'frameDrum', vol: 0.9, pattern: 'X . . x . . X . . x . x' },
    { inst: 'tambourine', vol: 0.7, pattern: '. . x . . x . . x . . x' },
    { inst: 'drone', vol: 0.7, octave: 2, bass: 'R . . . . . . . . . . .' },
    { inst: 'lute', vol: 0.75, octave: 4, arp: '1 . 3 5 . 3 1 . 3 5 3 1' },
    {
      inst: 'flute',
      vol: 0.85,
      bars: [
        'D5 - E5 F5 - G5 A5 - - D5 - -',
        'E5 - - C5 - D5 E5 - G5 E5 - -',
        'F5 - E5 D5 - E5 F5 - A5 G5 - F5',
        'E5 - - - - - . . . E5 F5 G5',
        'A5 - G5 F5 - E5 D5 - F5 A5 - -',
        'G5 - E5 C5 - E5 G5 - E5 C5 - -',
        'D5 - F5 Bb5 - - E5 - G5 C6 - -',
        'D6 - - A5 - F5 D5 - - - . .',
      ],
    },
  ],
};
