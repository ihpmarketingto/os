-- IHP OS — Phase 1: expand the Phase 0 client stub into a real Client 360 profile.

alter table public.clients
  add column website text,
  add column social_handles jsonb not null default '{}'::jsonb,
  add column brand_kit jsonb not null default '{}'::jsonb,
  add column contract_start_date date,
  add column contract_end_date date,
  add column renewal_notice_days integer,
  add column retainer_amount numeric(10, 2),
  add column health_score integer,
  add column health_score_updated_at timestamptz,
  add column health_score_explanation text;

comment on column public.clients.health_score is 'Computed on read by lib/health/score.ts from tasks/approvals/renewal proximity, cached here so list views do not recompute per row.';
