import type { EventKind } from './types';

/**
 * The reviewed question library. A person on the team wrote and approved every
 * entry; the app only chooses among them (see suggest.ts). `{name}` is the kid's
 * first name, `{title}` the event as the parent typed it.
 *
 * Rules (from the design system): one open question, under 15 words, no yes/no.
 * Tips name a real moment.
 */
export type Phase = 'before' | 'after';
export type Topic = 'school' | 'friends' | 'feelings' | 'interests' | 'looking-ahead' | 'family';

export interface Prompt {
  id: string;
  question: string;
  tip: string;
  topic: Topic;
  /** For event prompts: which kinds and whether to ask before or after the event. */
  kinds?: EventKind[];
  phase?: Phase;
  /** 1 = light, 2 = deeper. Generic prompts start light. */
  depth: 1 | 2;
}

const E = (id: string, kinds: EventKind[], phase: Phase, question: string, tip: string, topic: Topic = 'school', depth: 1 | 2 = 1): Prompt => ({ id, kinds, phase, question, tip, topic, depth });
const G = (id: string, topic: Topic, question: string, tip: string, depth: 1 | 2 = 1): Prompt => ({ id, topic, question, tip, depth });

export const EVENT_PROMPTS: Prompt[] = [
  // Tests and quizzes
  E('test-b1', ['test'], 'before', 'What part of {title} feels most ready?', 'Ask in the car. Start with what’s going well, not what isn’t.'),
  E('test-b2', ['test'], 'before', 'If you could pick one topic to skip on {title}, what would it be?', 'A sideways way in. Laugh with them about it.'),
  E('test-b3', ['test'], 'before', 'How do you like to get ready the night before something like this?', 'Let them tell you their system before you offer yours.', 'school', 2),
  E('test-a1', ['test'], 'after', 'What was the first question on {title}?', 'Specific and easy to answer. The rest tends to follow.'),
  E('test-a2', ['test'], 'after', 'Which part of {title} surprised you?', 'Works at dinner. Avoid asking for the score.'),
  E('test-a3', ['test'], 'after', 'What would you tell a friend taking {title} tomorrow?', 'Puts them in the expert seat.', 'school', 2),
  // Tryouts and auditions
  E('tryout-b1', ['tryout'], 'before', 'What are you hoping the coach notices tomorrow?', 'Side by side, while packing the bag.'),
  E('tryout-b2', ['tryout'], 'before', 'Who else is trying out that you’re glad will be there?', 'Shifts it from pressure to people.', 'friends'),
  E('tryout-a1', ['tryout'], 'after', 'What was one moment at {title} you wish I’d seen?', 'Ask on the drive home. Then just listen.', 'school', 2),
  E('tryout-a2', ['tryout'], 'after', 'What did you do at {title} that you’d do again?', 'Whatever the result, this one lands.'),
  // Games and matches
  E('game-b1', ['game'], 'before', 'What’s the one thing you want to try in {title}?', 'Quick, at pickup. No coaching.'),
  E('game-a1', ['game'], 'after', 'Who was easy to work with at {title} today?', 'Good for the car. Follow with “what did they do that helped?”', 'friends'),
  E('game-a2', ['game'], 'after', 'What was the best play you saw today, by anyone?', 'Takes the spotlight off their own performance.'),
  // Performances
  E('perf-b1', ['performance'], 'before', 'Which part of {title} are you most excited to show people?', 'Ask while they’re practicing, not right before.'),
  E('perf-a1', ['performance'], 'after', 'What did it feel like right before you started?', 'Bedtime works. Share your own nerves story if they shrug.', 'feelings', 2),
  E('perf-a2', ['performance'], 'after', 'Who in the audience did you look for?', 'Short and sweet. Lets them say they looked for you.', 'family'),
  // Projects and presentations
  E('proj-b1', ['project', 'presentation'], 'before', 'What’s the part of {title} you’re proudest of so far?', 'Sunday afternoon, before the last push.'),
  E('proj-b2', ['project', 'presentation'], 'before', 'If {title} could have one more day, what would you add?', 'A light way to find out if they’re behind.', 'school', 2),
  E('proj-a1', ['project', 'presentation'], 'after', 'What question did someone ask you about {title}?', 'Specific. Better than “how did it go?”'),
  E('proj-a2', ['presentation'], 'after', 'What did you say that got a reaction?', 'Dinner table. Celebrate the reaction, whatever it was.'),
  // Social
  E('soc-b1', ['social'], 'before', 'Who are you most looking forward to seeing at {title}?', 'Keep it light. Don’t add who you hope is there.', 'friends'),
  E('soc-a1', ['social'], 'after', 'What was the funniest thing that happened at {title}?', 'Next morning over breakfast. Laugh first, ask later.', 'friends'),
  E('soc-a2', ['social'], 'after', 'Who did you end up spending the most time with at {title}?', 'Curious, not checking. Follow their lead.', 'friends', 2),
  // Trips
  E('trip-b1', ['trip'], 'before', 'What do you want to make sure you see on {title}?', 'While packing.'),
  E('trip-a1', ['trip'], 'after', 'What’s one thing from {title} you’d want to go back to?', 'On the drive home, when they’re tired and talkative.'),
  // Anything else
  E('other-b1', ['other'], 'before', 'How are you feeling about {title} coming up?', 'Open, no agenda. Let the answer be short.', 'feelings'),
  E('other-a1', ['other'], 'after', 'What’s one thing about {title} you didn’t expect?', 'Ask side by side, like cooking or driving.'),
];

export const GENERIC_PROMPTS: Prompt[] = [
  G('g-school-1', 'school', 'What was the best ten minutes of your day?', 'Ask in the car. Share yours first if they shrug.'),
  G('g-school-2', 'school', 'Which class went fastest today?', 'A sideways way to ask what they’re enjoying.'),
  G('g-school-3', 'school', 'What’s something a teacher said today that stuck with you?', 'Dinner table. No follow-up about grades.', 2),
  G('g-friends-1', 'friends', 'Who made you laugh today?', 'Quick, at pickup. Laugh with them.'),
  G('g-friends-2', 'friends', 'Who’s someone at school you’d like to know better?', 'If they shrug, share your own answer first.'),
  G('g-friends-3', 'friends', 'What’s something your friends are into that I wouldn’t get?', 'Be ready to not get it. That’s the point.', 2),
  G('g-feel-1', 'feelings', 'What’s one thing that would make tomorrow better?', 'Bedtime. Then say goodnight; don’t fix it.'),
  G('g-feel-2', 'feelings', 'When did you feel most like yourself this week?', 'Walking the dog or a long drive.', 2),
  G('g-int-1', 'interests', 'What have you been watching or listening to lately?', 'Ask them to play you one thing.'),
  G('g-int-2', 'interests', 'If you had a free Saturday and no plans, what would you do?', 'While cooking together.'),
  G('g-ahead-1', 'looking-ahead', 'What’s something you’re looking forward to this month?', 'Ask while you’re side by side. It feels less like an interview.'),
  G('g-ahead-2', 'looking-ahead', 'What do you want to be really good at by summer?', 'Car ride. Resist suggesting things.', 2),
  G('g-fam-1', 'family', 'What’s one thing we should do more of as a family?', 'Sunday dinner. Take notes, out loud.'),
  G('g-fam-2', 'family', 'What’s a rule at home you’d change if you could?', 'Only ask if you’re ready to hear it.', 2),
];

export const LIBRARY: Prompt[] = [...EVENT_PROMPTS, ...GENERIC_PROMPTS];
export const promptById = (id: string) => LIBRARY.find((p) => p.id === id);

export const TOPIC_LABEL: Record<Topic, string> = {
  school: 'School',
  friends: 'Friends',
  feelings: 'Feelings',
  interests: 'Interests',
  'looking-ahead': 'Looking ahead',
  family: 'Family',
};

export function fill(question: string, kidName: string, title?: string) {
  return question.replace(/\{name\}/g, kidName).replace(/\{title\}/g, title ?? 'it');
}

/**
 * The second move: what to do once the kid actually answers. One follow-up that
 * stays with their answer, and one listening tip (from the evidence brief: interest
 * and validation predict the next disclosure). Never advice, never a lecture.
 */
export const SECOND_MOVE: Record<Topic, { followUp: string; listen: string }> = {
  school: { followUp: 'What was that part like for you?', listen: 'Repeat their last three words back, then wait. Don’t fix anything yet.' },
  friends: { followUp: 'What did they do that made it fun?', listen: 'Ask for the story, not the lesson. If they trail off, let the silence sit.' },
  feelings: { followUp: 'What would have made it a little easier?', listen: 'Name the feeling you heard (“sounds frustrating”) and stop there.' },
  interests: { followUp: 'Can you show me one thing from it?', listen: 'Be genuinely curious. Let them be the expert for two minutes.' },
  'looking-ahead': { followUp: 'What’s the first small step toward that?', listen: 'Don’t add your own hopes. Theirs are the point.' },
  family: { followUp: 'What would that look like next week?', listen: 'Take it seriously out loud, even if the answer is “pizza every night”.' },
};
