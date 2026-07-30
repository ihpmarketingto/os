import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" });

const CADENCE_LABEL: Record<string, string> = {
  one_time: "One time",
  monthly: "Monthly",
  quarterly: "Quarterly",
};

export default async function ServicesSettingsPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: packages }, { data: links }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("service_packages")
      .select("id, slug, name, category, description, cadence, default_included_hours, default_price, is_active")
      .eq("organisation_id", session.organisationId)
      .order("category")
      .order("name"),
    supabase
      .from("service_package_templates")
      .select("service_package_id, trigger, template:task_templates(name)")
      .eq("organisation_id", session.organisationId)
      .order("sort_order"),
    supabase
      .from("client_services")
      .select("service_package_id, status")
      .eq("organisation_id", session.organisationId)
      .is("deleted_at", null),
  ]);

  const sopsByPackage = new Map<string, { name: string; trigger: string }[]>();
  for (const link of links ?? []) {
    const name = (link.template as unknown as { name: string } | null)?.name;
    if (!name) continue;
    if (!sopsByPackage.has(link.service_package_id)) sopsByPackage.set(link.service_package_id, []);
    sopsByPackage.get(link.service_package_id)!.push({ name, trigger: link.trigger });
  }

  const activeCountByPackage = new Map<string, number>();
  for (const sub of subscriptions ?? []) {
    if (sub.status !== "active") continue;
    activeCountByPackage.set(sub.service_package_id, (activeCountByPackage.get(sub.service_package_id) ?? 0) + 1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Service catalogue</CardTitle>
        <CardDescription>
          What IHP sells, and the SOPs each service runs. Setup work fires once when a client buys the service;
          per-cycle work regenerates every month or quarter through the service delivery automation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!packages || packages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No services yet. Run the seed script to install the catalogue.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Cadence</TableHead>
                <TableHead>Included hours</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Delivery SOPs</TableHead>
                <TableHead>Clients</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => {
                const sops = sopsByPackage.get(pkg.id) ?? [];
                return (
                  <TableRow key={pkg.id}>
                    <TableCell>
                      <p className="font-medium">{pkg.name}</p>
                      <p className="max-w-md text-xs text-muted-foreground">{pkg.description}</p>
                      <Badge variant="outline" className="mt-1 text-[10px] capitalize">
                        {pkg.category.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{CADENCE_LABEL[pkg.cadence]}</TableCell>
                    <TableCell className="text-xs">{pkg.default_included_hours ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {pkg.default_price ? cad.format(Number(pkg.default_price)) : "—"}
                    </TableCell>
                    <TableCell>
                      {sops.length === 0 ? (
                        <span className="text-xs text-risk">No SOP linked</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {sops.map((sop, i) => (
                            <li key={i} className="text-xs">
                              {sop.name}
                              <span className="text-muted-foreground">
                                {sop.trigger === "on_start" ? " (setup)" : " (each cycle)"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{activeCountByPackage.get(pkg.id) ?? 0}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
