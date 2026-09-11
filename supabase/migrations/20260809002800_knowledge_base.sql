-- IHP OS — Knowledge base.
--
-- This is where IHP's own learned experience lives: how the work is done,
-- what the offers are, who they are for, what has actually worked. Until now
-- an AI draft could see the client row and nothing else, so it wrote like a
-- competent stranger. This gives it something to be grounded in.
--
-- The load-bearing rule, from the operating brief: never use one client's
-- confidential information as a reference source for another client's
-- output. That is enforced structurally here rather than left to whoever
-- writes the next retrieval query.

create table public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  /* Null means agency-wide: how IHP works, applicable to any client. */
  client_id uuid references public.clients (id) on delete cascade,
  kind text not null check (kind in (
    'sop',              -- how a piece of work gets done, step by step
    'playbook',         -- the approach for a situation or channel
    'brand_voice',      -- how to sound, for IHP or for a client
    'offer',            -- what is being sold, at what price, with what promise
    'icp',              -- who it is for, and who it is not for
    'objection',        -- what they push back on and the honest answer
    'winning_pattern',  -- what has actually worked, with the evidence
    'positioning',      -- how this is different from the alternatives
    'policy',           -- a rule that must be followed
    'faq'
  )),
  title text not null,
  /* The material itself. Markdown expected. */
  body text not null,
  /* A short abstract used for ranking and for fitting more entries into a
     prompt than the bodies alone would allow. */
  summary text,
  tags text[] not null default '{}',

  /*
   * The isolation control.
   *
   * 'agency_general' may be retrieved for any client: it describes how IHP
   * works, not anything a client told us in confidence.
   *
   * 'client_confidential' may only ever be retrieved for the client it
   * belongs to. Their pricing, their margins, their internal reasoning.
   * Retrieval enforces this, and the check below makes the contradictory
   * case (confidential but belonging to nobody) impossible to store.
   */
  confidentiality text not null default 'agency_general'
    check (confidentiality in ('agency_general', 'client_confidential')),

  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),

  /* Where this came from, so a claim can be traced back out of the system. */
  source_reference text,

  /*
   * Stale knowledge is worse than none: the model will state a withdrawn
   * offer with total confidence. Entries carry a review date and retrieval
   * marks anything past it.
   */
  review_due_on date,
  last_reviewed_at timestamptz,
  last_reviewed_by uuid references public.profiles (id),

  /* Supersession rather than editing in place, so a draft that cited an
     older version can still be explained afterwards. */
  supersedes_id uuid references public.knowledge_entries (id) on delete set null,

  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint agency_knowledge_cannot_be_client_confidential
    check (client_id is not null or confidentiality = 'agency_general')
);

comment on constraint agency_knowledge_cannot_be_client_confidential on public.knowledge_entries is
  'An entry belonging to no client cannot be client-confidential. Without this, a confidential entry with a null client_id would match the agency-wide branch of every retrieval query and leak into every client''s AI context.';

comment on column public.knowledge_entries.confidentiality is
  'client_confidential entries are retrievable only for their own client. Enforced in selectKnowledgeForContext in @ihp/types, which is tested against exactly this leak.';

create index knowledge_entries_lookup_idx
  on public.knowledge_entries (organisation_id, status, kind)
  where deleted_at is null;

create index knowledge_entries_client_idx
  on public.knowledge_entries (organisation_id, client_id)
  where deleted_at is null;

create index knowledge_entries_tags_idx on public.knowledge_entries using gin (tags);

create index knowledge_entries_review_idx
  on public.knowledge_entries (organisation_id, review_due_on)
  where deleted_at is null and status = 'active';

-- ---------------------------------------------------------------------------
-- Which entries an AI run actually used. ai_source_citations already exists
-- for retrieved records; this links a run to knowledge specifically so
-- "where did that claim come from" is answerable.
-- ---------------------------------------------------------------------------
create table public.ai_knowledge_citations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  ai_run_id uuid not null references public.ai_runs (id) on delete cascade,
  knowledge_entry_id uuid not null references public.knowledge_entries (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index ai_knowledge_citations_run_idx on public.ai_knowledge_citations (ai_run_id);

-- ---------------------------------------------------------------------------
-- RLS. Knowledge rides on the content permission. Client-scoped entries
-- additionally require access to that client, so the database refuses to
-- hand over another client's confidential material even if a query asks.
-- ---------------------------------------------------------------------------
alter table public.knowledge_entries enable row level security;
alter table public.ai_knowledge_citations enable row level security;

create policy "internal members with content.read see knowledge"
  on public.knowledge_entries for select
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.has_permission(organisation_id, 'content', 'read', client_id))
  );

create policy "content.create required to add knowledge"
  on public.knowledge_entries for insert
  with check (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.has_permission(organisation_id, 'content', 'create', client_id))
  );

create policy "content.update required to edit knowledge"
  on public.knowledge_entries for update
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.has_permission(organisation_id, 'content', 'update', client_id))
  );

create policy "internal members see knowledge citations"
  on public.ai_knowledge_citations for select
  using (private.is_internal_member(organisation_id));

create policy "internal members record knowledge citations"
  on public.ai_knowledge_citations for insert
  with check (private.is_internal_member(organisation_id));
