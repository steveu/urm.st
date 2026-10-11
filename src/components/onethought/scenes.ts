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
// caught. Lines in brackets are thought, not said. {trouble} is the worst of the hole:
// the water, the trees, the bunker, the great beyond. Never a number; nothing here says
// what to press; nothing here reaches the sim.

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
};
export type MomentKind = 'chip' | 'putt' | 'escape' | 'pure' | 'tidy';
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
        trouble: [rope('Ooh! Straight in {trouble}! Seen it all now!'), partner('pleased', 'Ha. They’ve got you there, mind.'), caddie('normal', 'Don’t look round. Walk.')],
        well: [rope('Fluke! Pure fluke! Bet you can’t do it twice!'), partner('pleased', 'They’re not wrong. I’ve seen you play.'), caddie('normal', 'That was no fluke. Walk on.')],
        fine: [rope('Was that the warm-up? When does the golf start?'), partner('pleased', 'Fair question, that.'), caddie('normal', 'It was a perfectly good hole. Eyes front.')],
      },
      build: {
        trouble: [
          you('thinking', '(One shot. Everyone finds {trouble} now and then.)'),
          rope('Next one’s over the creek! Brought your trunks?'),
          partner('pleased', 'Go on. Say something back. You know you want to.'),
          caddie('thinking', 'Don’t. That’s exactly what they’re after.'),
          you('thinking', '(Don’t turn round. …They’ll be stood right by the next tee, though.)'),
        ],
        well: [
          you('thinking', '(It wasn’t a fluke. I hit it where I looked.)'),
          rope('Twice, then! Go on! We’ll all be watching!'),
          partner('pleased', 'They will, too. Right by the tee, the lot of them.'),
          caddie('thinking', 'Let them watch. You swing.'),
          you('thinking', '(Right by the tee. Every one of them. Watching.)'),
        ],
        fine: [
          you('thinking', '(It was fine. It was a fine hole.)'),
          rope('We’ll be at the next! Bring your best one! Or any one!'),
          partner('pleased', 'Ooh. They’re coming with us.'),
          caddie('thinking', 'Course they are. Ignore it.'),
          you('thinking', '(Any one. Cheeky. …They’ll be right behind me on that tee.)'),
        ],
      },
      key: [you('shocked', '(…Right. That’s got to me. I can feel my face going red.)')],
      caught: [caddie('pleased', 'There. You saw it go up. That’s half the job.'), partner('pleased', 'Have a scowl, then. Get it out before the tee.')],
      missed: [rope('Touchy!'), caddie('thinking', 'You’re carrying that onto the tee. I can see it from here.')],
    },
    // To the 13th: the four-ball waiting on the last tee, and the rope's favourite line
    {
      open: {
        trouble: [rope('How was {trouble}? Lovely this time of year!'), partner('shocked', 'Oof. That’s a good one, to be fair.'), caddie('normal', 'It’s not that good. Keep walking.')],
        well: [rope('Shot! …Was that the practice one?'), partner('pleased', 'Ha! Even the compliments come with a sting.'), caddie('normal', 'Keep the first word. Leave the rest.')],
        fine: [rope('Thrilling stuff! Wake us up for the last!'), partner('pleased', 'They’re saving the good ones for you tonight.'), caddie('normal', 'Let them. The last hole’s ours, not theirs.')],
      },
      build: [
        rope('Here! That four-ball on the next tee’s been waiting all night!'),
        partner('normal', 'They have, mind. Look at them. Arms folded.'),
        caddie('thinking', 'Nobody’s in a hurry. Take your time on it.'),
        you('thinking', '(Don’t rush it. …Are they tapping their watches?)'),
        rope('Any chance this year?'),
        partner('pleased', 'Ha! Sorry. Sorry. That one was good.'),
      ],
      key: [you('shocked', '(Even my own partner’s laughing. Right. That’s under my skin.)')],
      caught: [partner('pleased', 'Look at your face! Go on, let it out. Then let’s play.'), caddie('pleased', 'Better on your face than in your swing.')],
      missed: [caddie('thinking', 'You’ve gone quiet. Not the good sort of quiet.'), you('thinking', '(I’m fine. Completely fine.)')],
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
      key: [you('shocked', '(Champ. They’ll be calling me that all night. And it’s working.)')],
      caught: [caddie('pleased', 'Let it show, then let it go. Good round.'), partner('pleased', 'Come on, champ. First one’s mine.')],
      missed: [partner('thinking', 'Face like thunder. What’s up?'), you('thinking', '(Nothing. Nothing at all.)')],
    },
  ],

  'Commit to the Line': [
    // To the 12th: the short hole over the creek, and which club
    {
      open: {
        trouble: [partner('pleased', 'Well, you committed to {trouble}. I’ll give you that.'), you('thinking', 'I was between two lines on that tee.'), caddie('normal', 'You were between two all the way down. That’s what did it.')],
        well: [partner('shocked', 'You didn’t even hesitate on that tee.'), you('pleased', 'Picked it. Hit it.'), caddie('pleased', 'That’s the whole trick.')],
        fine: [partner('normal', 'Not bad. Not quite the one you wanted?'), you('thinking', 'Half of me wanted the other line.'), caddie('normal', 'Half of you hit it, then.')],
      },
      build: [
        caddie('thinking', 'Short one now, over the creek. The club for the number, or one more swung easy.'),
        partner('pleased', 'One more. Swing easy. Nobody ever came up long and wet.'),
        caddie('normal', 'The club for the number’s the honest one. Full swing, no thinking.'),
        you('thinking', '(One more is safe over the water… the right club’s the cleaner swing…)'),
        partner('pleased', 'One more. Trust me. When have I ever been wrong?'),
        caddie('thinking', 'Do you want the list?'),
      ],
      key: [you('normal', '(The club for the number. Full swing. That’s the one.)'), you('normal', '(One more, swung easy. Decided.)')],
      caught: [caddie('pleased', 'Good. Decided before the tee. That’s the job done.'), partner('shocked', 'On the walk? I haven’t even found a ball yet.')],
      missed: [caddie('thinking', 'Still weighing it, aren’t you. It’ll be heavier on the tee.'), you('thinking', '(That one. Or one more. I’ll know when I’m stood over it.)')],
    },
    // To the 13th: lay up short of the creek, or take it on
    {
      open: {
        trouble: [caddie('thinking', 'That one found {trouble}. Were you sure over it?'), you('thinking', 'I was sure until I wasn’t.'), partner('pleased', 'Story of my life, that.')],
        well: [caddie('pleased', 'Picked the club, swung it. Lovely.'), partner('shocked', 'Show-off.'), you('pleased', 'Committed, that’s all.')],
        fine: [caddie('normal', 'Middling. You fiddled with it on the tee.'), you('thinking', 'I re-gripped. A bit.'), partner('pleased', 'A lot. I was watching.')],
      },
      build: [
        caddie('normal', 'Long one now. The creek cuts across before the green. Lay up short of it, or take it on.'),
        partner('pleased', 'Take it on. You only live once.'),
        caddie('thinking', 'Laying up leaves you a wedge in. Taking it on leaves you a story.'),
        you('thinking', '(Laying up’s sensible. Taking it on’s… tempting.)'),
        partner('pleased', 'Stories are better than wedges.'),
        caddie('normal', 'Not when the story’s wet.'),
      ],
      key: [you('normal', '(Lay up. Decided. Not thinking about it again.)'), you('normal', '(Taking it on. Decided. No looking back.)')],
      caught: [partner('shocked', 'Just like that? I’ve changed mine three times.'), caddie('pleased', 'Good. Now it’s only a swing.')],
      missed: [caddie('thinking', 'You’ll decide over the ball, then. Lovely. My favourite.'), you('thinking', '(I’ll know when I see it. Probably.)')],
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
      caught: [partner('shocked', 'No dithering? I’ll get them in, then.'), caddie('pleased', 'Should’ve played like that all round.')],
      missed: [partner('pleased', 'I’ll order you a tea. You can change it later.'), you('thinking', '(Tea. Probably. Or…)')],
    },
  ],

  'Pins Are a Psyop': [
    // To the 12th: the hole cut front right, just over the creek
    {
      open: {
        trouble: [partner('pleased', 'You found {trouble}. Going at something, were you?'), you('thinking', 'It looked so close.'), caddie('thinking', 'They always look close. That’s the idea of them.')],
        well: [partner('shocked', 'Middle of the green and you still walked off happy. How?'), you('pleased', 'Boring golf. It works.'), caddie('pleased', 'It does. Don’t tell anyone.')],
        fine: [partner('pleased', 'I went straight at that flag. Missed it by a mile.'), you('normal', 'I saw.'), caddie('normal', 'Everyone saw. It’s on the bank.')],
      },
      build: [
        caddie('thinking', 'Short one next. They’ve cut the hole front right, just over the creek.'),
        partner('pleased', 'Front right! Lovely. I’m going right at it.'),
        caddie('normal', 'Plenty of green the other side. Back left’s huge.'),
        you('thinking', '(Front right… a little cut in over the water… it’d be close…)'),
        partner('pleased', 'Go on. Have a go with me. Flags are for aiming at.'),
        caddie('thinking', 'Flags are for putting at. From the middle.'),
      ],
      key: [you('normal', '(No. Middle of the green. Boring. Fine.)')],
      caught: [partner('shocked', 'The middle? You’re no fun at all.'), caddie('pleased', 'That’s my golfer.')],
      missed: [partner('pleased', 'That’s the spirit! Straight at it, both of us!'), caddie('thinking', '…Right. I’ll get the towel ready.')],
    },
    // To the 13th: the last green, the creek across its front, the flag behind it
    {
      open: {
        trouble: [caddie('thinking', 'That was {trouble}. You were aiming at the flag, weren’t you.'), you('thinking', '…Maybe.'), partner('pleased', 'Course you were. We all were.')],
        well: [partner('shocked', 'The fat of the green again? And you made it look easy.'), you('pleased', 'It is easy. That’s the point.'), caddie('pleased', 'Keep that between us.')],
        fine: [partner('pleased', 'I had a look at that flag. The flag had a look back.'), you('normal', 'And?'), partner('shocked', 'And I’m in the bunker. Again.')],
      },
      build: [
        caddie('normal', 'The last green’s worse. Creek right across the front, flag tucked front left behind it.'),
        partner('pleased', 'Front left behind water. They’re daring us.'),
        caddie('thinking', 'They are. Right of it, there’s room for a tent.'),
        you('thinking', '(If it comes off it’s close… if it’s short it’s wet…)'),
        partner('normal', 'Well? You going at it with me?'),
      ],
      key: [you('normal', '(No. Right of it. The fat. Boring target.)')],
      caught: [partner('shocked', 'Again? Where’s your sense of adventure?'), caddie('pleased', 'Boring wins. Not every night. But most.')],
      missed: [partner('pleased', 'Both going at it, then. Brilliant.'), caddie('thinking', 'I’ll walk on ahead and fetch the ball out.')],
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
      caught: [partner('shocked', 'Dull all the way to the bar. I almost admire it.'), caddie('pleased', 'Boring’s lovely. First round’s on the bore.')],
      missed: [partner('pleased', 'See? Tomorrow you’ll be going at them with me.'), caddie('thinking', 'We’ll see.')],
    },
  ],
};

/** A moment from the hole worth keeping, said by whoever would say it */
export const MOMENT: Record<MomentKind, Line> = {
  chip: partner('shocked', 'You chipped it in. I’m still not over it.'),
  putt: partner('pleased', 'That putt never left the hole. Lovely.'),
  escape: partner('shocked', 'How did you get out of that? Honestly.'),
  pure: caddie('pleased', 'That strike back there, though. Pure. Hang on to that.'),
  tidy: caddie('pleased', 'Tidy hole, that. Nothing wasted.'),
};

const TROUBLE_WORDS: Record<Exclude<Trouble, 'rough'>, string> = { water: 'the water', out: 'the great beyond', trees: 'the trees', sand: 'the bunker' };

/** The hole just played, as a scene needs it */
export type Story = { hole: number; went: Went; trouble: ReadonlySet<Trouble>; feats: ReadonlySet<MomentKind> };
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
  const mk = (['chip', 'putt', 'escape', 'pure'] as const).find((k) => st.feats.has(k)) ?? (st.went === 'well' ? 'tidy' : null);
  const key = sc.key[Math.floor(r() * sc.key.length)];
  const build = Array.isArray(sc.build) ? sc.build : sc.build[branch];
  return {
    lead: [...sc.open[branch].map(fill), ...(mk ? [{ ...MOMENT[mk], moment: true }] : []), ...build.map(fill), { ...fill(key), key: true }],
    caught: sc.caught.map(fill),
    missed: sc.missed.map(fill),
  };
}
