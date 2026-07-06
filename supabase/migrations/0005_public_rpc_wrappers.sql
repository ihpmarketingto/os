-- IHP OS — Phase 0: public RPC wrappers around the `private` permission
-- helpers, so application code (not just RLS policies) can ask
-- "can this user do X" without duplicating the permission graph in JS.

create function public.has_permission(p_org_id uuid, p_resource text, p_action text, p_client_id uuid default null)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select private.has_permission(p_org_id, p_resource, p_action, p_client_id);
$$;

create function public.can_access_client(p_org_id uuid, p_client_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select private.can_access_client(p_org_id, p_client_id);
$$;

grant execute on function public.has_permission(uuid, text, text, uuid) to authenticated;
grant execute on function public.can_access_client(uuid, uuid) to authenticated;
