import { createFileRoute, Link } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PersonAvatar } from "@/components/PersonAvatar";
import { useAuth } from "@/lib/auth";
import { useLedger, useProfiles } from "@/lib/hooks";
import { formatMinor } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/people/")({
  head: () => ({
    meta: [
      { title: "People — Settle" },
      { name: "description", content: "Everyone you share expenses and loans with." },
      { property: "og:title", content: "People — Settle" },
      { property: "og:description", content: "Balances with each person you track." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PeoplePage,
});

function PeoplePage() {
  const { user } = useAuth();
  const me = user?.id ?? "";
  const profiles = useProfiles().filter((p) => p.id !== me);
  const { balances } = useLedger(me);

  const sorted = [...profiles].sort(
    (a, b) => Math.abs(balances.get(b.id) ?? 0) - Math.abs(balances.get(a.id) ?? 0),
  );

  return (
    <AppShell title="People" subtitle="Balances across circles and loans">
      {sorted.length ? (
        <ul className="card-soft divide-y divide-border overflow-hidden">
          {sorted.map((p) => {
            const value = balances.get(p.id) ?? 0;
            return (
              <li key={p.id}>
                <Link
                  to="/people/$personId"
                  params={{ personId: p.id }}
                  className="tap flex items-center gap-3 px-4 py-3"
                >
                  <PersonAvatar profile={p} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      @{p.username}
                    </span>
                  </span>
                  <span
                    className={`num shrink-0 text-sm font-bold ${
                      value > 0 ? "text-due" : value < 0 ? "text-owe" : "text-muted-foreground"
                    }`}
                  >
                    {value === 0 ? "settled" : formatMinor(Math.abs(value))}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="card-soft p-8 text-center">
          <UserRound className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
          <h2 className="mt-3 font-display text-lg font-bold">Nobody here yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            People appear once they join Settle and you share a circle or a loan.
          </p>
        </div>
      )}
    </AppShell>
  );
}
