import type { DateKey } from './types';

/**
 * Pip's template engine: turns "Math worksheet, due tomorrow" into a few timed
 * steps. Shared by the demo and the real backend so both plan the same way.
 */
export type QuestType = 'reading' | 'worksheet' | 'writing' | 'project' | 'test' | 'other';

export const QUEST_TYPES: { key: QuestType; label: string; hint: string }[] = [
  { key: 'reading', label: 'Reading', hint: 'A chapter, an article, pages' },
  { key: 'worksheet', label: 'Worksheet', hint: 'Problem sets, practice questions' },
  { key: 'writing', label: 'Writing', hint: 'Essay, paragraph, lab write-up' },
  { key: 'project', label: 'Project', hint: 'Slides, poster, build' },
  { key: 'test', label: 'Test or quiz', hint: 'Becomes a boss battle' },
  { key: 'other', label: 'Something else', hint: 'One step, you name the time' },
];

export interface PlannedStep {
  label: string;
  minutes: number;
  hint?: string;
}

export interface QuestPlan {
  title: string;
  kind: 'quest' | 'boss';
  dueDate: DateKey;
  acorns: number;
  teacher?: string;
  when?: string;
  reward?: string;
  steps: PlannedStep[];
}

export function planQuest(input: { title: string; type: QuestType; dueDate: DateKey; teacher?: string; minutes?: number }): QuestPlan {
  const title = input.title.trim();
  const base = { title, dueDate: input.dueDate, teacher: input.teacher?.trim() || undefined };
  switch (input.type) {
    case 'reading':
      return { ...base, kind: 'quest', acorns: 10, when: 'before bed', steps: [
        { label: 'Read the first half', minutes: 12, hint: 'Skim the headings first so you know where it’s going.' },
        { label: 'Read the rest', minutes: 12 },
        { label: 'Write 2 sentences: what happened?', minutes: 4, hint: 'Just two. Who did what, and why it matters.' },
      ] };
    case 'worksheet':
      return { ...base, kind: 'quest', acorns: 10, steps: [
        { label: 'Do the first 3 problems', minutes: 10, hint: 'Start with one you already know how to do.' },
        { label: 'Do the rest', minutes: 15 },
        { label: 'Check your answers', minutes: 5, hint: 'Circle anything you guessed. Ask tomorrow.' },
      ] };
    case 'writing':
      return { ...base, kind: 'quest', acorns: 15, steps: [
        { label: 'Jot 3 bullet points', minutes: 5, hint: 'Messy is fine. Ideas first, sentences later.' },
        { label: 'Turn them into a draft', minutes: 15 },
        { label: 'Read it out loud once and fix', minutes: 7, hint: 'If you stumble while reading, the sentence needs a fix.' },
      ] };
    case 'project':
      return { ...base, kind: 'quest', acorns: 20, steps: [
        { label: 'List what’s left to do', minutes: 5 },
        { label: 'Do the smallest piece', minutes: 15, hint: 'Momentum beats size.' },
        { label: 'Do one more piece', minutes: 15 },
        { label: 'Save and note tomorrow’s first step', minutes: 3 },
      ] };
    case 'test':
      return { ...base, kind: 'boss', acorns: 30, reward: 'rare item waiting', steps: [
        { label: 'Review notes', minutes: 10, hint: 'Say each heading out loud, then what’s under it.' },
        { label: 'Practice problems or flashcards', minutes: 15 },
        { label: 'Self-quiz', minutes: 10, hint: 'Cover the answers. Guess first, then check.' },
        { label: 'Redo what you missed', minutes: 10 },
      ] };
    default:
      return { ...base, kind: 'quest', acorns: 5, steps: [{ label: title || 'Do it', minutes: Math.min(180, Math.max(5, input.minutes ?? 20)) }] };
  }
}

/** Study habits a student can add when the plan is empty. */
export const HABIT_LIBRARY: { id: string; title: string; sub: string; acorns: number; when?: string; steps: PlannedStep[] }[] = [
  { id: 'spot', title: 'Set up a study spot', sub: 'One place, same every night', acorns: 10, steps: [
    { label: 'Pick one spot you’ll always use', minutes: 3 },
    { label: 'Clear it and put a pencil + paper there', minutes: 7, hint: 'Phone goes somewhere you can’t see it.' },
  ] },
  { id: 'bag', title: 'Pack your bag tonight', sub: 'Calmer mornings', acorns: 5, when: 'before bed', steps: [{ label: 'Pack everything for tomorrow', minutes: 5 }] },
  { id: 'read20', title: '20 minutes of reading', sub: 'Any book you like', acorns: 10, when: 'before bed', steps: [{ label: 'Read for 20 minutes', minutes: 20, hint: 'A timer helps. Stop when it rings, even mid-page.' }] },
  { id: 'review10', title: 'Review today’s notes', sub: '10 minutes, right after school', acorns: 10, steps: [
    { label: 'Reread today’s notes from one class', minutes: 6 },
    { label: 'Write one question you still have', minutes: 4, hint: 'Ask it tomorrow. Teachers love this.' },
  ] },
  { id: 'plan', title: 'Plan the week', sub: 'Sunday, 10 minutes', acorns: 15, steps: [
    { label: 'List what’s due this week', minutes: 5 },
    { label: 'Pick which night each thing happens', minutes: 5 },
  ] },
  { id: 'ask', title: 'Ask one question in class', sub: 'Any class, any question', acorns: 10, steps: [{ label: 'Ask one question today', minutes: 1, hint: '“Can you say that again?” counts.' }] },
  { id: 'sleep', title: 'Screens off 30 min before bed', sub: 'Better sleep, better focus', acorns: 10, when: 'before bed', steps: [{ label: 'Plug the phone in outside your room', minutes: 2 }] },
  { id: 'flash', title: 'Make 10 flashcards', sub: 'For your next test', acorns: 15, steps: [
    { label: 'Write 10 cards', minutes: 12 },
    { label: 'Test yourself once', minutes: 6 },
  ] },
];
