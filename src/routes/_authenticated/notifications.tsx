import { createFileRoute } from "@tanstack/react-router";
import { BellOff, CheckCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PendingSettlements } from "@/components/PendingSettlements";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/hooks";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/mutations";

export const Route = createFileRoute("/_authenticated/notifications")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Notifications — Settle" },
      { name: "description", content: "Payments awaiting your confirmation and other updates." },
      { property: "og:title", content: "Notifications — Settle" },
      { property: "og:description", content: "Confirmations, loans and reminders." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const me = user?.id ?? "";
  const notifications = useNotifications(me).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  return (
    <AppShell
      title="Notifications"
      action={
        notifications.some((n) => !n.read_at) ? (
          <Button
            variant="outline"
            className="h-10 rounded-xl text-xs"
            onClick={() => void markAllNotificationsRead(me)}
          >
            <CheckCheck className="mr-1.5 h-4 w-4" aria-hidden="true" /> Mark all read
          </Button>
        ) : null
      }
    >
      <div className="space-y-6">
        <PendingSettlements userId={me} />

        {notifications.length ? (
          <ul className="card-soft divide-y divide-border overflow-hidden">
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void markNotificationRead(n.id)}
                  className={`tap w-full px-4 py-3 text-left ${n.read_at ? "" : "bg-secondary/50"}`}
                >
                  <span className="flex items-center gap-2">
                    {!n.read_at ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{n.title}</span>
                  </span>
                  {n.body ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">{n.body}</span>
                  ) : null}
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card-soft p-8 text-center">
            <BellOff className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm text-muted-foreground">You're all caught up.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
