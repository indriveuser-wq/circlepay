import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PersonAvatar } from "@/components/PersonAvatar";
import { useAuth } from "@/lib/auth";
import { displayName, useActivity, useProfileMap } from "@/lib/hooks";
import { formatMinor } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/activity")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Activity — Settle" },
      { name: "description", content: "Every expense, loan and settlement in one timeline." },
      { property: "og:title", content: "Activity — Settle" },
      { property: "og:description", content: "Your full Settle timeline." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const { user } = useAuth();
  const me = user?.id ?? "";
  const profiles = useProfileMap();
  const events = useActivity().sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <AppShell title="Activity" subtitle="Newest first">
      {events.length ? (
        <ul className="card-soft divide-y divide-border overflow-hidden">
          {events.map((event) => (
            <li key={event.id} className="flex items-center gap-3 px-4 py-3">
              <PersonAvatar profile={profiles.get(event.actor_id)} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm">
                  <span className="font-semibold">
                    {event.actor_id === me ? "You" : displayName(profiles.get(event.actor_id))}
                  </span>{" "}
                  {event.summary}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {new Date(event.created_at).toLocaleString()}
                </span>
              </span>
              {event.amount_minor ? (
                <span className="num shrink-0 text-sm font-semibold">
                  {formatMinor(event.amount_minor, event.currency ?? "NPR")}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="card-soft p-6 text-sm text-muted-foreground">Nothing has happened yet.</p>
      )}
    </AppShell>
  );
}
