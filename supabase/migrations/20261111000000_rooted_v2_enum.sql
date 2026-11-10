-- Rooted v2, part 1: the new outcome. On its own because a new enum value cannot be
-- used in the same transaction that adds it (the rule tests apply each file as one).
alter type public.talk_outcome add value if not exists 'wrong_moment';
