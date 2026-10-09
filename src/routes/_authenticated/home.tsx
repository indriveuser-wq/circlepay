import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, HandCoins, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PendingSettlements } from "@/components/PendingSettlements";
import { PersonAvatar } from "@/components/PersonAvatar";
import { useAuth } from "@/lib/auth";
import { displayName, useActivity, useLedger, useProfile, useProfileMap } from "@/lib/hooks";
import { formatMinor } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/home")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Your balances — Settle" },
      { name: "description", content: "See what you owe, what you're owed and what's pending." },
      { property: "og:title", content: "Your balances — Settle" },
      { property: "og:description", content: "Your shared expenses and loans at a glance." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const me = user?.id ?? "";
  const profile = useProfile(me);
  const profiles = useProfileMap();
  const { balances, totalOwedToMe, totalIOwe } = useLedger(me);
  const activity = useActivity()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8);

  const people = [...balances.entries()]
    .filter(([, value]) => value !== 0)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  return (
    <AppShell
      title={`Hi, ${(profile?.name ?? "there").split(" ")[0]}`}
      subtitle="Here's where you stand right now"
    >
      <div className="space-y-6">
        <section className="grid grid-cols-2 gap-3">
          <div className="card-soft p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <ArrowDownLeft className="h-3.5 w-3.5 text-due" aria-hidden="true" /> You're owed
            </div>
            <p className="num mt-1.5 text-2xl font-extrabold text-due">
              {formatMinor(totalOwedToMe)}
            </p>
          </div>
          <div className="card-soft p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <ArrowUpRight className="h-3.5 w-3.5 text-owe" aria-hidden="true" /> You owe
            </div>
            <p className="num mt-1.5 text-2xl font-extrabold text-owe">{formatMinor(totalIOwe)}</p>
          </div>
        </section>

        <PendingSettlements userId={me} />

        <section aria-labelledby="people-heading" className="space-y-3">
          <h2
            id="people-heading"
            className="text-sm font-bold uppercase tracking-wide text-muted-foreground"
          >
            People
          </h2>
          {people.length ? (
            <ul className="card-soft divide-y divide-border overflow-hidden">
              {people.map(([id, value]) => (
                <li key={id}>
                  <Link
                    to="/people/$personId"
                    params={{ personId: id }}
                    className="tap flex items-center gap-3 px-4 py-3"
                  >
                    <PersonAvatar profile={profiles.get(id)} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {displayName(profiles.get(id))}
                    </span>
                    <span
                      className={`num text-sm font-bold ${value > 0 ? "text-due" : "text-owe"}`}
                    >
                      {value > 0 ? "owes you " : "you owe "}
                      {formatMinor(Math.abs(value))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="card-soft flex items-center gap-3 p-5 text-sm text-muted-foreground">
              <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              All square. Add an expense or a loan to start tracking.
            </div>
          )}
        </section>

        <section aria-labelledby="recent-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2
              id="recent-heading"
              className="text-sm font-bold uppercase tracking-wide text-muted-foreground"
            >
              Recent activity
            </h2>
            <Link to="/activity" className="text-xs font-semibold text-primary">
              See all
            </Link>
          </div>
          {activity.length ? (
            <ul className="card-soft divide-y divide-border overflow-hidden">
              {activity.map((event) => (
                <li key={event.id} className="flex items-center gap-3 px-4 py-3">
                  <HandCoins className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">
                      {event.actor_id === me ? "You" : displayName(profiles.get(event.actor_id))}
                    </span>{" "}
                    {event.summary}
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
            <p className="card-soft p-5 text-sm text-muted-foreground">
              Nothing yet. Your expenses, loans and settlements will show up here.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
