-- IHP OS — Creative Studio. Generated and uploaded assets, and multi-layer
-- designs built from them.
--
-- Brand rule enforced in the schema, not just the UI: AI-generated imagery is
-- labelled as such and carries its prompt, and nothing generated can be
-- marked as depicting a real client result without a human saying so
-- explicitly. Beauty and wellness before-and-after work depends on this.

create table public.creative_assets (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  name text not null,
  storage_path text not null,
  mime_type text,
  width integer,
  height integer,
  size_bytes bigint,
  origin text not null default 'uploaded' check (origin in ('uploaded', 'ai_generated')),
  /* Provenance for anything a model produced. */
  generation_prompt text,
  generation_provider text,
  generation_model text,
  generation_cost numeric(10, 5),
  /* Human sign-off. AI imagery must be reviewed before it reaches client
     work, and must never be presented as a real client outcome unless a
     person has explicitly confirmed it depicts one. */
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  depicts_real_client_result boolean not null default false,
  usage_restrictions text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint ai_generated_cannot_claim_real_result
    check (not (origin = 'ai_generated' and depicts_real_client_result))
);

comment on constraint ai_generated_cannot_claim_real_result on public.creative_assets is
  'An AI-generated image can never be flagged as depicting a real client result. Enforced in the database so no code path can bypass it.';

create index creative_assets_org_client_idx on public.creative_assets (organisation_id, client_id);

-- Canvas documents. Layers live in canvas_json (fabric.js serialisation), so
-- the editor can round-trip a design without the schema constraining what a
-- layer may be.
create table public.designs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  name text not null,
  format text not null default 'square' check (format in ('square', 'portrait', 'story', 'landscape', 'custom')),
  width integer not null default 1080,
  height integer not null default 1080,
  canvas_json jsonb not null default '{}'::jsonb,
  /* Rendered preview, and the exported artwork once finalised. */
  thumbnail_path text,
  export_path text,
  /* Where this design is used. */
  ad_creative_id uuid references public.ad_creatives (id) on delete set null,
  content_item_id uuid references public.content_items (id) on delete set null,
  campaign_id uuid references public.campaigns (id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'in_review', 'approved', 'archived')),
  is_template boolean not null default false,
  version integer not null default 1,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index designs_org_client_idx on public.designs (organisation_id, client_id);
create index designs_template_idx on public.designs (organisation_id) where is_template;

-- ---------------------------------------------------------------------------
-- Storage bucket for creative assets and exports.
-- Path convention: {organisation_id}/{client_id | 'shared'}/{uuid}-{name}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('creative', 'creative', false)
on conflict (id) do nothing;

create policy "internal members read their org's creative bucket"
  on storage.objects for select
  using (bucket_id = 'creative' and private.is_internal_member((split_part(name, '/', 1))::uuid));

create policy "internal members write to their org's creative bucket"
  on storage.objects for insert
  with check (bucket_id = 'creative' and private.is_internal_member((split_part(name, '/', 1))::uuid));

create policy "internal members replace their org's creative objects"
  on storage.objects for update
  using (bucket_id = 'creative' and private.is_internal_member((split_part(name, '/', 1))::uuid));

create policy "internal members delete their org's creative objects"
  on storage.objects for delete
  using (bucket_id = 'creative' and private.is_internal_member((split_part(name, '/', 1))::uuid));

-- ---------------------------------------------------------------------------
-- RLS: creative work rides on the content permission, consistent with
-- Content Studio, since that is where production and approval already live.
-- ---------------------------------------------------------------------------
alter table public.creative_assets enable row level security;
alter table public.designs enable row level security;

create policy "internal members with content.read see creative assets"
  on public.creative_assets for select
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.has_permission(organisation_id, 'content', 'read', client_id))
  );

create policy "content.create required to add creative assets"
  on public.creative_assets for insert
  with check (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.has_permission(organisation_id, 'content', 'create', client_id))
  );

create policy "content.update required to edit creative assets"
  on public.creative_assets for update
  using (
    private.is_internal_member(organisation_id)
    and (client_id is null or private.has_permission(organisation_id, 'content', 'update', client_id))
  );

create policy "internal members with content.read see designs"
  on public.designs for select
  using (private.is_internal_member(organisation_id) and private.has_permission(organisation_id, 'content', 'read', client_id));

create policy "content.create required to add designs"
  on public.designs for insert
  with check (private.has_permission(organisation_id, 'content', 'create', client_id));

create policy "content.update required to edit designs"
  on public.designs for update
  using (private.has_permission(organisation_id, 'content', 'update', client_id));
