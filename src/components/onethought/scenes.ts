// The walks between holes, as scenes: a short dialogue on the walk to the next tee (or to
// the clubhouse after the last), between you, your caddie and your partner, with the rope
// heard but never seen. Each is one concrete situation with people taking sides and you
// wavering, and it builds to a key line, which is the moment the thought's tap means:
//
//   The Heckler (tap when you let it show): the rope says one thing about your golf and
//     won't let it go; your partner sides with them, your caddie with you; the key line
//     is where it gets to you.
//   Commit to the Line (tap as you commit): the caddie frames the next decision, your
//     partner pushes the other way, you go back and forth; the key line is the pick.
//   Pins Are a Psyop (tap when you take the boring target): the next flag is tucked, your
//     partner goes at every flag, you're tempted; the key line is settling on the middle.
//
// Each scene opens on how the hole just played went (trouble, well, or fine), may carry a
// moment worth keeping from it (a hold keeps it), and closes on whether the key line was
// caught. The round builds: the walk to the 13th has a line back to the first walk's key
// line, and the clubhouse walk closes on how the earlier two went. The walks get longer as the round does: a few lines to the 12th, a few more to
// the 13th, and the clubhouse walk has the room. The opening also knows what you did over
// the ball, where the thought has a view of it: a sound call that didn't come off isn't a
// bad one, and a shaky one that did isn't a good one (CALLED, below). Lines in brackets
// are thought, not said. {trouble} is the worst of the hole: the water, the trees, the
// bunker, the great beyond. Never a number; nothing here says what to press; nothing here
// reaches the sim.

export type Speaker = 'you' | 'caddie' | 'partner' | 'rope';
/** A face: as they are, pleased with it, caught out, or thinking it over */
export type Face = 'normal' | 'pleased' | 'shocked' | 'thinking';
export type Line = { who: Speaker; face?: Face; text: string; shake?: boolean };
export type Branch = 'trouble' | 'well' | 'fine';
export type Scene = {
  open: Record<Branch, Line[]>;
  build: Line[] | Record<Branch, Line[]>;
  /** The key line: one, or a choice of them, picked by the round's seed */
  key: Line[];
  caught: Line[];
  missed: Line[];
  /** The walk to the 13th: a line back to the first walk's key line, caught or let go */
  back?: { caught: Line; missed: Line };
  /** The clubhouse walk: the last word, on whether the earlier key lines were caught */
  verdict?: Record<Arc, Line>;
};
type Arc = 'all' | 'none' | 'some';
export type MomentKind = 'ace' | 'holeout' | 'chip' | 'putt' | 'escape' | 'pure' | 'tidy';
export type Went = 'well' | 'fine' | 'rough';
export type Trouble = 'water' | 'out' | 'trees' | 'sand' | 'rough';

const you = (face: Face, text: string): Line => ({ who: 'you', face, text });
const caddie = (face: Face, text: string): Line => ({ who: 'caddie', face, text });
const partner = (face: Face, text: string): Line => ({ who: 'partner', face, text });
// The rope is heard, not seen: every line of theirs lands with a jolt
const rope = (text: string): Line => ({ who: 'rope', text, shake: true });

/** Per thought, the three walks: to the 12th, to the 13th, to the clubhouse */
export const SCENES: Record<string, [Scene, Scene, Scene]> = {
  'The Heckler': [
    // To the 12th: the short hole, with the gallery stood right by its tee
    {
      open: {
        trouble: [rope('Ooh! Straight into {trouble}! Seen it all now!'), partner('pleased', 'Ha. They’ve got you there, mind.')],
        well: [rope('Fluke! Pure fluke! Bet you can’t do it twice!'), partner('pleased', 'They’re not wrong. I’ve seen you play.')],
        fine: [rope('Was that the warm-up? When does the golf start?'), partner('pleased', 'They’ve a point.')],
      },
      build: {
        trouble: [rope('Next one’s over the creek! Brought your trunks?')],
        well: [rope('Twice, then! Go on! We’ll all be watching!')],
        fine: [rope('See you at the next! Bring your best one. Or any one.')],
      },
      key: [you('shocked', '(…Right. That’s got to me. My face is going.)')],
      caught: [caddie('pleased', 'There. You saw it go up. That’s half the job.')],
      missed: [caddie('thinking', 'You’re carrying that onto the tee. I can see it.')],
    },
    // To the 13th: the four-ball waiting on the last tee, and the rope's favourite line
    {
      open: {
        trouble: [rope('How was {trouble}? Lovely this time of year!'), caddie('normal', 'It’s not that good. Keep walking.')],
        well: [rope('Shot! …Was that the practice one?'), caddie('normal', 'Keep the first word. Leave the rest.')],
        fine: [rope('Thrilling stuff! Wake us up for the last!'), caddie('normal', 'Let them. The last hole’s ours, not theirs.')],
      },
      back: {
        caught: partner('pleased', 'You went red on the short hole. Then it passed. Annoying.'),
        missed: partner('pleased', 'You held it in on the short hole. They’ll only try harder.'),
      },
      build: [
        rope('Here! That four-ball on the next tee’s been waiting all night!'),
        rope('Any chance this year?'),
        partner('pleased', 'Ha! Sorry. Sorry. That one was good.'),
      ],
      key: [you('shocked', '(My own partner. Right. That’s under my skin.)')],
      caught: [partner('pleased', 'Look at your face! Go on, let it out. Then let’s play.')],
      missed: [caddie('thinking', 'You’ve gone quiet. Not the good sort of quiet.')],
    },
    // To the clubhouse: they'll all be in the same bar
    {
      open: {
        trouble: [rope('Shame about {trouble} on the last! Lovely round otherwise!'), partner('pleased', 'They’ll be telling that one in the bar.'), caddie('normal', 'Everyone finds {trouble}. Not everyone gets a commentary.')],
        well: [rope('Well played! …Don’t let it go to your head!'), partner('shocked', 'Was that a compliment? From the rope?'), caddie('pleased', 'It was. Mostly.')],
        fine: [rope('Same time next week? We’ll bring chairs!'), partner('pleased', 'They’re fans, really. Deep down.'), caddie('normal', 'Very deep down.')],
      },
      build: [
        partner('normal', 'They’re all going in the bar after, you know. Same bar as us.'),
        you('thinking', '(Same bar. Of all the bars.)'),
        rope('See you inside, champ! First round’s on you!'),
        caddie('thinking', 'You don’t have to buy them anything.'),
        partner('pleased', 'You should, though. Shut them up for good.'),
      ],
      key: [you('shocked', '(Champ. All night, that. And it’s working.)')],
      caught: [partner('pleased', 'Come on, champ. First one’s mine.')],
      missed: [partner('thinking', 'Face like thunder. What’s up?'), you('thinking', '(Nothing. Nothing at all.)')],
      verdict: {
        all: caddie('pleased', 'Short hole, last tee. Let it show, let it go, both times. Good round.'),
        none: caddie('thinking', 'They had you on the short hole and the last tee. You never let on.'),
        some: caddie('normal', 'Once out there you let it show. Once you swallowed it. That’s most people.'),
      },
    },
  ],

  'Commit to the Line': [
    // To the 12th: the short hole over the creek, and the flag or the fat of the green
    {
      open: {
        trouble: [you('thinking', 'I was between two lines on that tee.'), caddie('normal', 'You were between two all the way down. That’s what did it.')],
        well: [partner('shocked', 'You didn’t even hesitate on that tee.'), caddie('pleased', 'That’s the whole trick.')],
        fine: [you('thinking', 'Half of me wanted the other line.'), caddie('normal', 'Half of you hit it, then.')],
      },
      build: [caddie('thinking', 'Short one now, over the creek. The flag, or the fat of the green. Either’s fine. Just the one.')],
      key: [you('normal', '(The flag. Straight at it. That’s the one.)'), you('normal', '(The fat of the green. Decided.)')],
      caught: [caddie('pleased', 'Good. Decided before the tee. That’s the job done.')],
      missed: [caddie('thinking', 'Still weighing it, aren’t you. It’ll be heavier on the tee.')],
    },
    // To the 13th: lay up short of the creek, or take it on
    {
      open: {
        trouble: [caddie('thinking', 'That one found {trouble}. Were you sure over it?'), you('thinking', 'I was sure until I wasn’t.')],
        well: [caddie('pleased', 'Picked it, swung it. Lovely.'), partner('pleased', 'Show-off.')],
        fine: [caddie('normal', 'Middling. You fiddled with it on the tee.'), you('thinking', 'I re-gripped. A bit.')],
      },
      back: {
        caught: partner('normal', 'You had the short one picked before we reached the tee. Unlike you.'),
        missed: partner('pleased', 'You were still choosing on the short one when we got to the tee.'),
      },
      build: [
        caddie('normal', 'Long one now. The creek cuts across before the green. Lay up short of it, or take it on.'),
        partner('pleased', 'Take it on. You only live once.'),
        caddie('thinking', 'Laying up leaves you a wedge in. Taking it on leaves you a story.'),
      ],
      key: [you('normal', '(Lay up. Decided. Not thinking about it again.)'), you('normal', '(Taking it on. Decided. No looking back.)')],
      caught: [caddie('pleased', 'Good. Now it’s only a swing.')],
      missed: [caddie('thinking', 'You’ll decide over the ball, then. Lovely. My favourite.')],
    },
    // To the clubhouse: the last decision of the day
    {
      open: {
        trouble: [partner('pleased', 'Brave call, that one into {trouble}.'), you('thinking', 'It was a call. Not sure it was brave.'), caddie('normal', 'It was half a call. That’s the trouble with half calls.')],
        well: [partner('shocked', 'Every decision, stuck to it. All round.'), you('pleased', 'Nearly all.'), caddie('pleased', 'Nearly’s a good round.')],
        fine: [partner('normal', 'You changed your mind a lot out there.'), you('thinking', 'I like to keep my options open.'), caddie('thinking', 'You kept them open on the backswing.')],
      },
      build: [
        partner('pleased', 'Right. Last decision of the day. What are you having?'),
        caddie('normal', 'Don’t ask. We’ll be here till closing.'),
        you('thinking', '(Pint… or tea. A pint’s a pint. Tea’s sensible.)'),
        partner('pleased', 'Kitchen’s shutting soon. The chips need a decision too.'),
        you('thinking', '(Pint. Tea. Chips. Pint…)'),
      ],
      key: [you('normal', '(Pint. Decided. And I’m sticking with it.)')],
      caught: [partner('shocked', 'No dithering? I’ll get them in, then.')],
      missed: [partner('pleased', 'I’ll order you a tea. You can change it later.'), you('thinking', '(Tea. Probably. Or…)')],
      verdict: {
        all: caddie('pleased', 'Flag or fat. Lay up or go. Picked on the walk, both times.'),
        none: caddie('thinking', 'Flag or fat. Lay up or go. Both picked over the ball.'),
        some: caddie('normal', 'Flag or fat. Lay up or go. One on the walk, one over the ball.'),
      },
    },
  ],

  'Pins Are a Psyop': [
    // To the 12th: the hole cut front right, just over the creek
    {
      open: {
        trouble: [partner('pleased', 'You found {trouble}. Going at something, were you?'), you('thinking', 'It looked so close.')],
        well: [partner('shocked', 'Middle of the green and you still walked off happy. How?'), you('pleased', 'Boring golf. It works.')],
        fine: [partner('pleased', 'I went straight at that flag. Missed it by a mile.'), caddie('normal', 'Everyone saw. It’s on the bank.')],
      },
      build: [caddie('thinking', 'Short one next. They’ve cut the hole front right, just over the creek.')],
      key: [you('normal', '(No. Middle of the green. Boring. Fine.)')],
      caught: [partner('shocked', 'The middle? You’re no fun at all.')],
      missed: [caddie('thinking', '…Right. I’ll get the towel ready.')],
    },
    // To the 13th: the last green, the creek across its front, the flag behind it
    {
      open: {
        trouble: [caddie('thinking', 'That was {trouble}. You were aiming at the flag, weren’t you.'), you('thinking', '…Maybe.')],
        well: [partner('shocked', 'The fat of the green again? And you made it look easy.'), you('pleased', 'It is easy. That’s the point.')],
        fine: [partner('pleased', 'I had a look at that flag. The flag had a look back.'), partner('shocked', 'And I’m in the bunker. Again.')],
      },
      back: {
        caught: you('thinking', '(Middle on the short one. Felt like cheating.)'),
        missed: you('thinking', '(I wanted that flag on the short one. Still do.)'),
      },
      build: [
        caddie('normal', 'The last green’s worse. Creek right across the front, flag tucked front left behind it.'),
        partner('pleased', 'Front left behind water. They’re daring us.'),
        caddie('thinking', 'They are. Right of it, there’s room for a tent.'),
      ],
      key: [you('normal', '(No. Right of it. The fat. Boring target.)')],
      caught: [partner('shocked', 'Again? Where’s your sense of adventure?')],
      missed: [caddie('thinking', 'I’ll walk on ahead and fetch the ball out.')],
    },
    // To the clubhouse: tomorrow's flags
    {
      open: {
        trouble: [partner('pleased', 'Into {trouble} on the last. Flag-hunting, were you?'), you('thinking', 'I was nowhere near the flag.'), caddie('normal', 'You were near enough to try.')],
        well: [partner('shocked', 'Middle of every green. Not one flag. And you’re the one smiling.'), you('pleased', 'Funny, that.'), caddie('pleased', 'Not funny. Planned.')],
        fine: [partner('pleased', 'I went at every flag today. Every single one.'), you('normal', 'How did that go?'), partner('thinking', '…Next question.')],
      },
      build: [
        caddie('normal', 'They’ll move the flags again tomorrow. Tuck them somewhere worse.'),
        partner('pleased', 'And I’ll go at every one. That’s golf.'),
        caddie('thinking', 'That’s one sort of golf.'),
        you('thinking', '(There’s always a flag. There’s always a middle.)'),
      ],
      key: [you('normal', '(Middle of the green. Every time. I’m fine with boring.)')],
      caught: [partner('shocked', 'Dull all the way to the bar. I almost admire it.')],
      missed: [partner('pleased', 'See? Tomorrow you’ll be going at them with me.')],
      verdict: {
        all: caddie('pleased', 'Front right, front left behind water. Middle both times. Boring’s lovely.'),
        none: caddie('thinking', 'Front right, front left behind water. You fancied both.'),
        some: caddie('normal', 'Front right, front left behind water. One middle, one flag. We’ll see.'),
      },
    },
  ],
};

/** A moment from the hole worth keeping, said by whoever would say it */
export const MOMENT: Record<MomentKind, Line> = {
  ace: partner('shocked', 'One. You took one. I’m telling everyone, you know that.'),
  holeout: partner('shocked', 'From all the way back there. In. I’d have taken the green.'),
  chip: partner('shocked', 'You chipped it in. I’m still not over it.'),
  putt: partner('pleased', 'That putt never left the hole. Lovely.'),
  escape: partner('shocked', 'How did you get out of that? Honestly.'),
  pure: caddie('pleased', 'That strike back there, though. Pure. Hang on to that.'),
  tidy: caddie('pleased', 'Tidy hole, that. Nothing wasted.'),
};

const TROUBLE_WORDS: Record<Exclude<Trouble, 'rough'>, string> = { water: 'the water', out: 'the great beyond', trees: 'the trees', sand: 'the bunker' };

/** What was done over the ball on the hole: each full swing's target by name (null if it
 *  was on none) and club, a line changed after stepping in, a swing let go before the
 *  routine was through, a line decided with a tap and then moved off (or, carrying Pins
 *  Are a Psyop, the boring target said and the flag swung at) */
export type Did = { swung: { pick: string | null; club: string }[]; doubt: boolean; hurried: boolean; moved: boolean };
/** The hole just played, as a scene needs it, and the earlier walks' key lines: caught
 *  or let go */
export type Story = { hole: number; went: Went; trouble: ReadonlySet<Trouble>; feats: ReadonlySet<MomentKind>; did: Did; caught: boolean[] };

// How the call over the ball looked to the thought carried: sound, shaky, or a word gone
// back on (carrying Commit to the Line, a line decided out loud and then left; carrying
// Pins Are a Psyop, boring said and the flag gone at). None if the thought had no call to
// judge on that hole (no flag to go at or leave, say)
type Call = 'sound' | 'shaky' | 'moved';
const callOf = (thought: string, d: Did): Call | null => {
  if (thought === 'Commit to the Line') return d.moved ? 'moved' : d.doubt ? 'shaky' : 'sound';
  if (thought === 'Pins Are a Psyop') {
    const picks = d.swung.map((s) => s.pick);
    return d.moved ? 'moved' : picks.includes('flag') ? 'shaky' : picks.includes('fat of the green') ? 'sound' : null;
  }
  return d.swung.length ? (d.hurried ? 'shaky' : 'sound') : null;
};

// The opening, where the call and the result disagree, or where a scene's own opening
// would say something that didn't happen. Any walk of the round; where nothing here
// fits, the scene opens as written
const movedOpen = [
  partner('pleased', 'You said “that one”. Then you hit the other one.'),
  you('thinking', 'I’d decided. Then I hadn’t.'),
  caddie('normal', 'Deciding’s the easy half. Staying decided is the job.'),
];
const CALLED: Record<string, Partial<Record<Call, Partial<Record<Branch, Line[]>>>>> = {
  'The Heckler': {
    sound: {
      trouble: [rope('Took your time over that! For all the good it did!'), partner('pleased', 'Ha. You did take your time, mind.'), caddie('normal', 'Full routine, and it still found {trouble}. That happens. Walk.')],
    },
    shaky: {
      trouble: [rope('Quick, weren’t you! Somewhere to be?'), partner('pleased', 'You did rush that one. Even I saw.'), caddie('thinking', 'They had you hurrying. That’s their whole game.')],
      well: [rope('Quick and lucky! Try it slowly!'), partner('shocked', 'You barely stood over it.'), caddie('thinking', 'It came off. Don’t count on the quick ones.')],
    },
  },
  'Commit to the Line': {
    sound: {
      trouble: [partner('pleased', 'Picked it, hit it, and straight into {trouble}.'), you('thinking', 'I picked it. It didn’t come off.'), caddie('normal', 'Then it was the right way to get it wrong.')],
      fine: [partner('normal', 'Nothing special, that.'), you('normal', 'I picked a line and hit it.'), caddie('pleased', 'Then it was a good hole, whatever it looked like.')],
    },
    shaky: {
      well: [partner('shocked', 'Changed your mind over it and it still came off.'), you('pleased', 'The second line was the right one.'), caddie('thinking', 'Or the first was, and you got away with it.')],
    },
    moved: { trouble: movedOpen, well: movedOpen, fine: movedOpen },
  },
  'Pins Are a Psyop': {
    sound: {
      trouble: [partner('pleased', 'All that boring and you still found {trouble}.'), you('thinking', 'I picked the middle. It didn’t come off.'), caddie('normal', 'Right target. Wrong bounce. Same target next time.')],
    },
    shaky: {
      well: [partner('shocked', 'You went straight at it! And it came off!'), you('pleased', 'It did, didn’t it.'), caddie('thinking', 'It did. Don’t make a habit of it.')],
      fine: [partner('pleased', 'You went at that flag with me. Welcome aboard.'), you('thinking', 'Just the once.'), caddie('normal', 'That’s what they all say.')],
    },
    moved: {
      trouble: [partner('pleased', 'Boring, was it? Into {trouble}?'), you('thinking', 'The flag looked closer from there.'), caddie('normal', 'It always does. That’s how they get you.')],
      well: [partner('pleased', 'Boring, was it?'), you('pleased', 'It came off.'), caddie('thinking', 'It did. You still said the middle.')],
      fine: [partner('pleased', 'Boring, was it?'), you('thinking', 'The middle. That was the plan.'), caddie('normal', 'It was a good plan.')],
    },
  },
};
/** A line on the stage: who, which face, the words, a jolt, whether it's the key line or a
 *  moment to keep */
export type Beat = Line & { key?: boolean; moment?: boolean };

/** The walk after the hole just played, for the thought carried: the lines up to and
 *  including the key line, and what follows it if it's caught or let go */
export function walkScene(thought: string, st: Story, r: () => number): { lead: Beat[]; caught: Beat[]; missed: Beat[] } {
  const sc = (SCENES[thought] ?? SCENES['The Heckler'])[st.hole - 1];
  const worst = (['water', 'out', 'trees', 'sand'] as const).find((t) => st.trouble.has(t));
  const branch: Branch = worst ? 'trouble' : st.went === 'well' ? 'well' : 'fine';
  const fill = (l: Line): Beat => ({ ...l, text: l.text.replace(/\{trouble\}/g, worst ? TROUBLE_WORDS[worst] : 'trouble') });
  const mk = (['ace', 'holeout', 'chip', 'putt', 'escape', 'pure'] as const).find((k) => st.feats.has(k)) ?? (st.went === 'well' ? 'tidy' : null);
  const key = sc.key[Math.floor(r() * sc.key.length)];
  const build = Array.isArray(sc.build) ? sc.build : sc.build[branch];
  const call = callOf(thought, st.did);
  const open = (call && CALLED[thought]?.[call]?.[branch]) || sc.open[branch];
  // The round so far: the first walk's key line, and the earlier walks' between them
  const back = sc.back && st.caught.length ? [sc.back[st.caught[0] ? 'caught' : 'missed']] : [];
  const arc: Arc = st.caught.every(Boolean) ? 'all' : st.caught.some(Boolean) ? 'some' : 'none';
  const last = sc.verdict && st.caught.length ? [sc.verdict[arc]] : [];
  return {
    lead: [...open.map(fill), ...(mk ? [{ ...MOMENT[mk], moment: true }] : []), ...back, ...build.map(fill), { ...fill(key), key: true }],
    caught: [...sc.caught, ...last].map(fill),
    missed: [...sc.missed, ...last].map(fill),
  };
}
