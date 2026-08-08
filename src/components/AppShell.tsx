import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Bell, Home, Plus, Users, UserRound, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";
import { SyncBadge } from "./SyncBadge";
import { AddSheet } from "./AddSheet";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/circles", label: "Circles", icon: Users },
  { to: "/activity", label: "Activity", icon: Activity },
  { to: "/people", label: "People", icon: UserRound },
  { to: "/profile", label: "Profile", icon: Wallet },
] as const;

export function AppShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { user } = useAuth();
  const notifications = useNotifications(user?.id ?? "");
  const unread = notifications.filter((n) => !n.read_at).length;
  const [addOpen, setAddOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh bg-background md:flex">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
        <Link to="/home" className="mb-8 flex items-center gap-2 px-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-bold">Settle</span>
        </Link>
        <nav className="flex flex-col gap-1" aria-label="Main">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "tap flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
                )}
              >
                <item.icon className="h-4.5 w-4.5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="tap mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-card transition-transform hover:-translate-y-0.5"
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Add
        </button>
        <div className="mt-auto px-1">
          <SyncBadge />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
          <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl font-bold leading-tight sm:text-2xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {action}
              <SyncBadge className="hidden sm:inline-flex md:hidden" />
              <Link
                to="/notifications"
                aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
                className="tap relative grid place-items-center rounded-full border border-border bg-card text-foreground"
              >
                <Bell className="h-4.5 w-4.5" aria-hidden="true" />
                {unread > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-owe px-1 text-[10px] font-bold text-owe-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Link>
            </div>
          </div>
        </header>

        <main className="app-shell mx-auto max-w-3xl px-4 pt-4 md:pb-10">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 items-end px-1">
          {NAV.map((item, index) => {
            const active = pathname.startsWith(item.to);
            const isMiddle = index === 2;
            return (
              <div key={item.to} className="relative flex justify-center">
                {isMiddle ? (
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    aria-label="Add expense, loan or request"
                    className="tap absolute -top-7 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lift transition-transform active:scale-95"
                  >
                    <Plus className="h-6 w-6" aria-hidden="true" />
                  </button>
                ) : null}
                <Link
                  to={item.to}
                  className={cn(
                    "tap flex w-full flex-col items-center gap-1 px-1 pb-2 pt-2 text-[10px] font-medium",
                    isMiddle && "pt-9",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              </div>
            );
          })}
        </div>
      </nav>

      <AddSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
