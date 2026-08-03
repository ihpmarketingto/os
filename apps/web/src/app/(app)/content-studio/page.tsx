import { toCalendarDate } from "@ihp/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ContentBoard, type ContentCardData } from "./content-board";
import { ContentCalendar, type CalendarItem } from "./content-calendar";
import { NewContentDialog } from "./new-content-dialog";

export default async function ContentStudioPage() {
  const session = await requireSession();
  const supabase = await getSupabaseServerClient();

  const [{ data: items }, { data: clients }] = await Promise.all([
    supabase
      .from("content_items")
      .select("id, client_id, platform, content_type, hook, status, publish_date, client:clients(name)")
      .eq("organisation_id", session.organisationId)
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").eq("organisation_id", session.organisationId).order("name"),
  ]);

  const cards: CalendarItem[] = (items ?? []).map((i) => ({
    id: i.id,
    clientId: i.client_id,
    clientName: (i.client as unknown as { name: string } | null)?.name ?? "Unknown client",
    platform: i.platform,
    contentType: i.content_type,
    hook: i.hook,
    status: i.status,
    publishDate: i.publish_date,
  }));

  const boardCards: ContentCardData[] = cards;

  // Today is resolved on the server so the calendar does not read the clock
  // during render and the first paint matches what the server sent.
  const today = toCalendarDate(new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Content Studio</h1>
          <p className="text-sm text-muted-foreground">Idea through published, with client approval built in.</p>
        </div>
        <NewContentDialog clients={clients ?? []} />
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="pt-4">
          <ContentBoard items={boardCards} />
        </TabsContent>

        <TabsContent value="calendar" className="pt-4">
          <ContentCalendar items={cards} today={today} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
