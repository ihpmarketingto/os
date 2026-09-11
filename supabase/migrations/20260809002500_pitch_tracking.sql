-- IHP OS — PR pitch tracking.
--
-- The outreach table already held a status lifecycle and nothing read it.
-- This adds what turns it from a log into something you can work from: when
-- to chase, how many times you already have, and what the pitch actually
-- produced when it landed.

alter table public.outreach
  /* When to chase, and how many times this has already been chased. Follow-up
     is where placements come from, and it is the first thing that gets
     dropped when nobody can see it is due. */
  add column follow_up_at timestamptz,
  add column follow_up_count integer not null default 0 check (follow_up_count >= 0),
  add column last_follow_up_at timestamptz,
  /* What the pitch produced. Recorded only when it actually ran, so a
     confirmed pitch and a published piece stay distinguishable. */
  add column placement_url text,
  add column placement_published_at date,
  add column placement_outlet text,
  /* Reach as reported by the outlet. Nullable on purpose: an unknown reach
     must not be averaged in as zero. */
  add column placement_reach integer check (placement_reach >= 0),
  add column angle text,
  add column updated_at timestamptz not null default now();

comment on column public.outreach.placement_reach is
  'Reach as stated by the outlet, not an estimate we invented. Null means unknown and is excluded from totals rather than counted as zero.';

create index outreach_follow_up_idx on public.outreach (organisation_id, follow_up_at)
  where status = 'sent';

create index outreach_client_idx on public.outreach (organisation_id, client_id);

-- RLS is already enabled on this table with crm.read/create/update policies
-- from 0013. Deliberately not adding a second set: Postgres ORs permissive
-- policies together, so a parallel campaigns.* set would widen access rather
-- than describe it. Pitch tracking rides on the crm permission.
