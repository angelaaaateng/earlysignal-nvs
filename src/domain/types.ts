/**
 * Rooted data model. Parent-only: there are no child accounts and nothing
 * here is ever written by or shown to a kid. Every row belongs to one parent.
 */

/** ISO calendar date in the parent's local time, e.g. "2026-11-10". */
export type DateKey = string;

export interface Parent {
  id: string;
  displayName: string;
  createdAt: string;
}

/** A kid as the parent describes them. Name, grade and interests only. */
export interface Kid {
  id: string;
  parentId: string;
  name: string;
  grade: number;
  interests: string[];
  activities: string[];
  createdAt: string;
}

export type EventKind = 'test' | 'tryout' | 'game' | 'performance' | 'project' | 'presentation' | 'social' | 'trip' | 'other';

/** Something on the kid's week that a question can be about. */
export interface KidEvent {
  id: string;
  kidId: string;
  title: string;
  kind: EventKind;
  date: DateKey;
  createdAt: string;
}

/** The parent's after-talk reflection. "Not tonight" is a valid answer. */
export type Outcome = 'not_tonight' | 'few_words' | 'good_talk' | 'really_talked';

/** One question the parent asked, and how it went. Notes stay on the device. */
export interface Talk {
  id: string;
  parentId: string;
  kidId: string;
  eventId?: string;
  promptId: string;
  question: string;
  moment?: Moment;
  outcome: Outcome;
  askedAt: string;
}

export type Moment = 'car' | 'dinner' | 'bedtime' | 'walk' | 'other';

/** The parent marked a week as planned (the Sunday check-in). */
export interface WeekReview {
  parentId: string;
  weekStart: DateKey;
  reviewedAt: string;
}

export interface Db {
  parents: Parent[];
  kids: Kid[];
  events: KidEvent[];
  talks: Talk[];
  weekReviews: WeekReview[];
}

export const OUTCOME_LABEL: Record<Outcome, string> = {
  not_tonight: 'Not tonight',
  few_words: 'A few words',
  good_talk: 'Good talk',
  really_talked: 'We really talked',
};

/** The 1–10 rating the brief asks for, derived from the four seeds. */
export const OUTCOME_RATING: Record<Outcome, number> = { not_tonight: 2, few_words: 5, good_talk: 8, really_talked: 10 };

export const MOMENT_LABEL: Record<Moment, string> = { car: 'Car ride', dinner: 'Dinner', bedtime: 'Bedtime', walk: 'Out for a walk', other: 'Somewhere else' };

export const EVENT_KIND_LABEL: Record<EventKind, string> = {
  test: 'Test or quiz',
  tryout: 'Tryout or audition',
  game: 'Game or match',
  performance: 'Performance or recital',
  project: 'Project due',
  presentation: 'Presentation',
  social: 'Party, dance or sleepover',
  trip: 'Field trip',
  other: 'Something else',
};

export const INTEREST_OPTIONS = ['Soccer', 'Basketball', 'Swimming', 'Dance', 'Theater', 'Music', 'Robotics', 'Art', 'Gaming', 'Reading', 'Cooking', 'Animals', 'Coding', 'Science', 'Fashion', 'YouTube'];
export const ACTIVITY_OPTIONS = ['Soccer practice', 'Band', 'Orchestra', 'Debate', 'Student council', 'Math club', 'Swim team', 'Dance class', 'Drama club', 'Robotics team', 'Piano lessons', 'Scouts', 'Tutoring', 'Volunteering'];
