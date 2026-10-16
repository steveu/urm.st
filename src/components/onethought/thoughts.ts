// The six thoughts on the app's menu, in the app's own words (Database/Seed.swift): the
// line you carry, and what a press of the button counts. Three are offered here, the
// ones the inner voice is cross-examined for (voice.ts), each with a word on what to
// watch for: yourself, the lines off the tee, the flag on the approach. The other setups
// (the flag against the fat, standing still to breathe) stay on the course whatever
// you carry.

export type Thought = { name: string; line: string; rule: string; watch?: string };

export const THOUGHTS: Thought[] = [
  { name: 'Full Routine', line: 'Same look, same waggle, same breath. Boring on purpose.', rule: 'Tap when you catch yourself skipping it.' },
  { name: 'Commit to the Line', line: 'Doubt all you like before you pick. None after.', rule: 'Tap as you commit to the line.', watch: 'Two lines off some tees, and second thoughts after. Catch the moment you pick one.' },
  { name: 'The Heckler', line: 'They only win if you answer back.', rule: 'Tap when you let it show.', watch: 'You’ll have a go at yourself. Catch it when it gets to you.' },
  { name: 'Ancient History', line: 'The last shot is finished.', rule: 'Tap as you let each shot go.', watch: 'The last one replays on the walk. Catch the moment you let it go.' },
  { name: 'Pins Are a Psyop', line: 'The flag is where they want you to aim.', rule: 'Tap when you take the boring target.', watch: 'Every flag is tucked. Catch the moment you take the middle of the green.' },
  { name: 'One Breath', line: 'You were going to breathe anyway. Spend one on purpose.', rule: 'Tap when you spend a breath on a nervy shot.', watch: 'Stand still over the ball and you’ll take one.' },
];

/** The three on offer, in the order the cards show them */
export const OFFERED = [2, 1, 4];

export const START = 1;
