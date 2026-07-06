import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { FlagRow } from "./flag-row";

export default async function FeatureFlagsPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();
  const canEdit = session.roleSlug === "agency_owner";

  const { data: flags, error } = await supabase
    .from("feature_flags")
    .select("key, is_enabled, organisation_id, description, rollout")
    .or(`organisation_id.eq.${session.organisationId},organisation_id.is.null`)
    .order("key");

  const merged = new Map<string, { key: string; enabled: boolean; description: string | null; rollout: string; overridden: boolean }>();
  for (const flag of flags ?? []) {
    const existing = merged.get(flag.key);
    if (flag.organisation_id === session.organisationId) {
      merged.set(flag.key, { key: flag.key, enabled: flag.is_enabled, description: flag.description, rollout: flag.rollout, overridden: true });
    } else if (!existing) {
      merged.set(flag.key, { key: flag.key, enabled: flag.is_enabled, description: flag.description, rollout: flag.rollout, overridden: false });
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {!canEdit ? (
          <p className="mb-4 text-sm text-muted-foreground">
            Only Agency Owners can change feature flags. You can view current status below.
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-risk">Failed to load feature flags: {error.message}</p>
        ) : merged.size === 0 ? (
          <p className="text-sm text-muted-foreground">No feature flags found. Run the seed script first.</p>
        ) : (
          <ul className="divide-y">
            {Array.from(merged.values()).map((flag) => (
              <li key={flag.key} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{flag.key}</p>
                  <p className="text-xs text-muted-foreground">
                    {flag.description ?? "No description"} {flag.overridden ? <Badge variant="outline" className="ml-2 text-[10px]">org override</Badge> : null}
                  </p>
                </div>
                <FlagRow flagKey={flag.key} enabled={flag.enabled} canEdit={canEdit} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
