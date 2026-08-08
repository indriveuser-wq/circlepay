import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, UserPlus, UserRound, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PersonAvatar } from "@/components/PersonAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useFriends, useLedger, useProfileMap } from "@/lib/hooks";
import { formatMinor } from "@/lib/money";
import { addFriend, removeFriend } from "@/lib/mutations";
import { findProfileByUsername, normalizeUsername, validateUsername } from "@/lib/username";

export const Route = createFileRoute("/_authenticated/people/")({
  head: () => ({
    meta: [
      { title: "Friends — Settle" },
      { name: "description", content: "Add friends by username and track balances with them." },
      { property: "og:title", content: "Friends — Settle" },
      { property: "og:description", content: "Your friends list and who added you back." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PeoplePage,
});

function PeoplePage() {
  const { user } = useAuth();
  const me = user?.id ?? "";
  const profiles = useProfileMap();
  const { balances } = useLedger(me);
  const { added, addedMe, isFriend } = useFriends(me);

  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const handle = normalizeUsername(query);
    const problem = validateUsername(handle);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      const found = await findProfileByUsername(handle);
      if (!found) {
        toast.error(`No account found for @${handle}. Enter the complete username.`);
        return;
      }
      await addFriend(me, found.id);
      toast.success(`Added ${found.name || "@" + handle} to your friends.`);
      setQuery("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add that friend.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="Friends" subtitle="Add people by username to track balances">
      <form onSubmit={onAdd} className="card-soft flex gap-2 p-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter full username, e.g. subham_9fdb"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="h-11"
          aria-label="Friend username"
        />
        <Button type="submit" className="tap h-11 shrink-0" disabled={busy}>
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserPlus className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="ml-1.5 hidden sm:inline">Add</span>
        </Button>
      </form>

      <section className="mt-5">
        <h2 className="mb-2 px-1 font-display text-sm font-bold">Your friends</h2>
        {added.length ? (
          <ul className="card-soft divide-y divide-border overflow-hidden">
            {added.map((f) => {
              const p = profiles.get(f.friend_id);
              const value = balances.get(f.friend_id) ?? 0;
              return (
                <li key={f.id} className="flex items-center">
                  <Link
                    to="/people/$personId"
                    params={{ personId: f.friend_id }}
                    className="tap flex min-w-0 flex-1 items-center gap-3 px-4 py-3"
                  >
                    <PersonAvatar profile={p} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {p?.name || "Member"}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        @{p?.username ?? "unknown"}
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
                  <button
                    type="button"
                    onClick={() => void removeFriend(f.id)}
                    className="tap px-3 py-3 text-muted-foreground"
                    aria-label={`Remove ${p?.name ?? "friend"}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card-soft p-8 text-center">
            <UserRound className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
            <h3 className="mt-3 font-display text-lg font-bold">No friends yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add someone with their complete username to see balances with them.
            </p>
          </div>
        )}
      </section>

      {addedMe.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 px-1 font-display text-sm font-bold">Added you</h2>
          <ul className="card-soft divide-y divide-border overflow-hidden">
            {addedMe.map((f) => {
              const p = profiles.get(f.user_id);
              const already = isFriend(f.user_id);
              return (
                <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                  <PersonAvatar profile={p} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {p?.name || "Member"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      @{p?.username ?? "unknown"}
                    </span>
                  </span>
                  {already ? (
                    <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                      Friends
                    </span>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="tap shrink-0"
                      onClick={() =>
                        void addFriend(me, f.user_id)
                          .then(() => toast.success("Added back."))
                          .catch((e: unknown) =>
                            toast.error(e instanceof Error ? e.message : "Could not add."),
                          )
                      }
                    >
                      Add back
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
