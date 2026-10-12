// The walks between holes, as scenes: a short dialogue on the walk to the next tee (or to
// the clubhouse after the last), between you, your caddie and your partner, and nobody
// else. Each is one concrete situation with people taking sides and you wavering, and
// somewhere in it is a key line, which is the moment the thought's tap means:
//
//   The Heckler (tap when you let it show): the heckler is you, in brackets, to yourself,
//     once a walk, and it knows where it hurts; your partner gives it something to go
//     on, your caddie tells you to leave it; the key line is where it gets to you, said
//     straight after it, and a tap on either catches it.
//   Commit to the Line (tap as you commit): the caddie frames the next decision, your
//     partner pushes the other way, you go back and forth; the key line is the pick.
//   Pins Are a Psyop (tap when you take the boring target): the next flag is tucked, your
//     partner goes at every flag, you're tempted; the key line is settling on the middle.
//
// Each scene opens on how the hole just played went (trouble, well, or fine), may carry a
// moment worth keeping from it (a hold keeps it), and has its key line where the round's
// seed puts it, among the places it still makes sense (keyAt), with what's said to it,
// caught or let go, straight after. It isn't always last, and it isn't the only thought
// in brackets: most walks have one more of yours that sounds like it and isn't. The
// round builds: the walk to the 13th has a line back to the first walk's key line, and
// the clubhouse walk closes on how the earlier two went. The walks get longer as the
// round does: a few lines to the 12th, a few more to the 13th, and the clubhouse walk has
// the room. The opening also knows what you did over the ball, where the thought has a
// view of it: a sound call that didn't come off isn't a bad one, and a shaky one that did
// isn't a good one (CALLED, below). On about one round in three a heron comes over the
// path on the clubhouse walk and the argument stops for it: nobody says anything, then it
// carries on (heron). Lines in brackets are thought, not said. {trouble} is
// the worst of the hole: the water, the trees, the bunker, the great beyond. Never a
// number; nothing here says what to press; nothing here reaches the sim.

export type Speaker = 'you' | 'caddie' | 'partner';
/** A face: as they are, pleased with it, caught out, or thinking it over */
export type Face = 'normal' | 'pleased' | 'shocked' | 'thinking';
export type Line = { who: Speaker; face?: Face; text: string };
export type Branch = 'trouble' | 'well' | 'fine';
export type Scene = {
  open: Record<Branch, Line[]>;
  build: Line[] | Record<Branch, Line[]>;
  /** The key line: one, or a choice of them, picked by the round's seed */
  key: Line[];
  /** The Heckler: the heckle the key line answers, said straight before it wherever it
   *  falls, and a place to catch it too: a tap on either is the same catch */
  lead?: Line;
  /** Where in the build the key line may fall, before which of its lines, picked by the
   *  round's seed; after all of them if none. Only places where what's said to it, and
   *  what's left of the build after that, still follow */
  keyAt?: number[];
  caught: Line[];
  missed: Line[];
  /** The walk to the 13th: a line back to the first walk's key line, caught or let go */
  back?: { caught: Line; missed: Line };
  /** The clubhouse walk: the last word, on whether the earlier key lines were caught */
  verdict?: Record<Arc, Line>;
  /** The clubhouse walk: where in the build the heron comes over, before which line, on
   *  the rounds it does */
  heron?: number;
};
type Arc = 'all' | 'none' | 'some';
export type MomentKind = 'ace' | 'holeout' | 'chip' | 'putt' | 'escape' | 'pure' | 'tidy';
export type Went = 'well' | 'fine' | 'rough';
export type Trouble = 'water' | 'out' | 'trees' | 'sand' | 'rough';

const you = (face: Face, text: string): Line => ({ who: 'you', face, text });
const caddie = (face: Face, text: string): Line => ({ who: 'caddie', face, text });
const partner = (face: Face, text: string): Line => ({ who: 'partner', face, text });

/** Per thought, the three walks: to the 12th, to the 13th, to the clubhouse */
export const SCENES: Record<string, [Scene, Scene, Scene]> = {
  'The Heckler': [
    // To the 12th: the short hole over the water, and the heckler's first go. It's you,
    // to yourself, so it talks to you as you, once a walk, and the key line is where it lands
    {
      open: {
        trouble: [partner('pleased', 'Into {trouble}. Bad luck. Mostly.')],
        well: [partner('shocked', 'Where did that come from?')],
        fine: [partner('pleased', 'Steady. Very steady. Bit dull.')],
      },
      build: [partner('pleased', 'Short one next, over the water. Don’t worry, nobody’s watching.'), you('thinking', '(…Wind’s got up a bit.)')],
      keyAt: [1],
      lead: you('thinking', '(They will, though. You know they will.)'),
      key: [you('thinking', '(…My ears have gone warm.)')],
      caught: [caddie('pleased', 'There. You saw it go up. That’s half the job.')],
      missed: [caddie('thinking', 'You’re carrying that onto the tee. I can see it.')],
    },
    // To the 13th: the long one, the creek, and last year, which your partner remembers
    // and the heckler won't let go of
    {
      open: {
        trouble: [caddie('normal', 'That’s {trouble}. It happens. Keep walking.'), partner('pleased', 'It does happen. Mostly to you.')],
        well: [caddie('pleased', 'Good hole. Take it.'), partner('shocked', 'Two in a row? Who are you?')],
        fine: [caddie('normal', 'Fine. One to go.'), partner('pleased', 'One to go. Plenty of time.')],
      },
      back: {
        caught: partner('pleased', 'You went red on the short hole. Then it passed. Annoying.'),
        missed: partner('pleased', 'You went quiet on the short hole. I’ll have to try harder.'),
      },
      build: [
        partner('pleased', 'Last one’s long. Remember last year? The creek? Twice? …Sorry. Sorry.'),
        caddie('thinking', 'Leave last year where it is.'),
        you('thinking', '(…Light’s going.)'),
      ],
      keyAt: [1, 2],
      lead: you('thinking', '(Twice. And the drop. They all watched the drop.)'),
      key: [you('thinking', '(…My own partner.)')],
      caught: [partner('pleased', 'Look at your face! Go on, let it out. Then let’s play.')],
      missed: [caddie('thinking', 'You’ve gone quiet. Not the good sort of quiet.')],
    },
    // To the clubhouse: they'll all be in the bar, and the heckler's sure they all saw
    {
      open: {
        trouble: [partner('pleased', 'Into {trouble} on the last. That’s the one they’ll remember.'), caddie('normal', 'Everyone finds {trouble}. Walk.')],
        well: [partner('shocked', 'Well played. Genuinely.'), caddie('pleased', 'Take it. It was earned.')],
        fine: [partner('pleased', 'Not bad. Not memorable. Not bad.'), caddie('normal', 'Not bad’s a round. Take it.')],
      },
      build: [
        partner('normal', 'They’ll all be in the bar after. The four-ball, the lot.'),
        caddie('thinking', 'Nobody saw anything. They were looking for their own balls.'),
        you('thinking', '(…Cold, now the sun’s gone.)'),
        partner('pleased', 'Someone’ll call you champ. Bound to.'),
      ],
      heron: 1,
      lead: you('thinking', '(The four-ball. They saw the last. They saw all of it.)'),
      key: [you('thinking', '(Champ. All night, that.)')],
      caught: [partner('pleased', 'Come on, champ. First one’s mine.')],
      missed: [partner('thinking', 'Face like thunder. What’s up?'), you('thinking', '(Nothing. Nothing at all.)')],
      verdict: {
        all: caddie('pleased', 'Short hole, last tee. It got to you, and you let it. Both times. Good round.'),
        none: caddie('thinking', 'Short hole, last tee. You kept it all in. It’s still in there.'),
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
      build: [caddie('thinking', 'Short one now, over the creek. The flag, or the fat of the green. Either’s fine. Just the one.'), you('normal', '(Tee in the left pocket. Right.)')],
      keyAt: [1, 2],
      key: [you('normal', '(The flag, then.)'), you('normal', '(The fat of the green, then.)')],
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
        you('normal', '(The creek. Again.)'),
      ],
      keyAt: [1, 4],
      key: [you('normal', '(Short of the creek. That’s it.)'), you('normal', '(Over the creek. That’s it.)')],
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
      heron: 3,
      key: [you('normal', '(Pint. That’s that.)')],
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
      build: [caddie('thinking', 'Short one next. They’ve cut the hole front right, just over the creek.'), you('normal', '(…The flag’s not that tucked.)')],
      keyAt: [1, 2],
      key: [you('normal', '(No. Middle of the green.)')],
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
        you('normal', '(…I’ve hit that shot before. Once.)'),
      ],
      keyAt: [1, 4],
      key: [you('normal', '(Right of it. The fat.)')],
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
      keyAt: [2, 3, 4],
      heron: 3,
      key: [you('normal', '(The middle. Every time.)')],
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
/** The hole just played, as a scene needs it, the earlier walks' key lines (caught or
 *  let go), and whether this is a round the heron comes over */
export type Story = { hole: number; went: Went; trouble: ReadonlySet<Trouble>; feats: ReadonlySet<MomentKind>; did: Did; caught: boolean[]; heron: boolean };

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
      trouble: [partner('pleased', 'You took your time over that one.'), caddie('normal', 'Full routine, and it still found {trouble}. That happens. Walk.')],
    },
    shaky: {
      trouble: [partner('pleased', 'You did rush that one. Even I saw.'), caddie('thinking', 'Something had you hurrying. It wasn’t the course.')],
      well: [partner('shocked', 'You barely stood over it.'), caddie('thinking', 'It came off. Don’t count on the quick ones.')],
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
 *  moment to keep, or a hush: nobody speaking, its words only for the status */
export type Beat = Line & { key?: boolean; lead?: boolean; moment?: boolean; hush?: boolean };

/** The walk after the hole just played, for the thought carried: the lines with the key
 *  line among them, and what's said to it if it's caught or let go */
export function walkScene(thought: string, st: Story, r: () => number): { lead: Beat[]; caught: Beat[]; missed: Beat[] } {
  const sc = (SCENES[thought] ?? SCENES['The Heckler'])[st.hole - 1];
  const worst = (['water', 'out', 'trees', 'sand'] as const).find((t) => st.trouble.has(t));
  const branch: Branch = worst ? 'trouble' : st.went === 'well' ? 'well' : 'fine';
  const fill = (l: Line): Beat => ({ ...l, text: l.text.replace(/\{trouble\}/g, worst ? TROUBLE_WORDS[worst] : 'trouble') });
  const mk = (['ace', 'holeout', 'chip', 'putt', 'escape', 'pure'] as const).find((k) => st.feats.has(k)) ?? (st.went === 'well' ? 'tidy' : null);
  const key = sc.key[Math.floor(r() * sc.key.length)];
  const build = Array.isArray(sc.build) ? sc.build : sc.build[branch];
  const at = sc.keyAt ? sc.keyAt[Math.floor(r() * sc.keyAt.length)] : build.length;
  const call = callOf(thought, st.did);
  const open = (call && CALLED[thought]?.[call]?.[branch]) || sc.open[branch];
  // The round so far: the first walk's key line, and the earlier walks' between them
  const back = sc.back && st.caught.length ? [sc.back[st.caught[0] ? 'caught' : 'missed']] : [];
  const arc: Arc = st.caught.every(Boolean) ? 'all' : st.caught.some(Boolean) ? 'some' : 'none';
  const last = sc.verdict && st.caught.length ? [sc.verdict[arc]] : [];
  const pair: Beat[] = [...(sc.lead ? [{ ...fill(sc.lead), lead: true }] : []), { ...fill(key), key: true }];
  const body: Beat[] = [...build.slice(0, at).map(fill), ...pair, ...build.slice(at).map(fill)];
  // The heron, on its rounds: the argument stops for it, then picks up where it was. Never
  // between the heckle and the key line
  if (st.heron && sc.heron !== undefined) body.splice(sc.heron + (at < sc.heron ? pair.length : 0), 0, { who: 'you', text: 'A heron comes over the path.', hush: true });
  return {
    lead: [...open.map(fill), ...(mk ? [{ ...MOMENT[mk], moment: true }] : []), ...back, ...body, ...last],
    caught: sc.caught.map(fill),
    missed: sc.missed.map(fill),
  };
}
