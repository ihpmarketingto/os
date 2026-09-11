-- IHP OS — Proposal line items.
--
-- Proposals existed with a single hand-typed amount, which drifts from what
-- was actually quoted the moment anything changes. Line items make the
-- amount derived, and let a proposal be priced straight from the service
-- catalogue so the quote and the delivery plan describe the same work.

create table public.proposal_line_items (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  /* Where the line came from, when it came from the catalogue. Kept as a
     reference rather than a copy so a package rename does not rewrite a
     quote that was already sent: description and unit_price are snapshotted
     onto the line at the time it is added. */
  service_package_id uuid references public.service_packages (id) on delete set null,
  description text not null,
  /* Snapshotted from the package, never read back through the reference. */
  cadence text not null default 'one_time' check (cadence in ('one_time', 'monthly', 'quarterly')),
  quantity numeric(8, 2) not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null default 0 check (unit_price >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

comment on column public.proposal_line_items.cadence is
  'Snapshotted from the service package. A recurring line and a one-time line must never be added into a single figure without saying which is which.';

create index proposal_line_items_proposal_idx on public.proposal_line_items (proposal_id, position);

alter table public.proposals
  /* Who it was sent to and by whom. Recording the send is not sending it:
     IHP OS does not transmit the proposal. */
  add column sent_to_email text,
  add column sent_by uuid references public.profiles (id);

alter table public.proposal_line_items enable row level security;

create policy "finance.read required to see proposal lines"
  on public.proposal_line_items for select
  using (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.proposals p
      where p.id = proposal_id and private.has_permission(p.organisation_id, 'finance', 'read', p.client_id)
    )
  );

create policy "finance.create required to add proposal lines"
  on public.proposal_line_items for insert
  with check (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.proposals p
      where p.id = proposal_id and private.has_permission(p.organisation_id, 'finance', 'create', p.client_id)
    )
  );

create policy "finance.update required to edit proposal lines"
  on public.proposal_line_items for update
  using (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.proposals p
      where p.id = proposal_id and private.has_permission(p.organisation_id, 'finance', 'update', p.client_id)
    )
  );

create policy "finance.delete required to remove proposal lines"
  on public.proposal_line_items for delete
  using (
    private.is_internal_member(organisation_id)
    and exists (
      select 1 from public.proposals p
      where p.id = proposal_id and private.has_permission(p.organisation_id, 'finance', 'delete', p.client_id)
    )
  );
