import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Receipt, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AddSheet, Field } from "@/components/AddSheet";
import { PersonAvatar } from "@/components/PersonAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import {
  displayName,
  useCircle,
  useCircleMembers,
  useExpenses,
  useLedger,
  useParticipants,
  useProfileMap,
  useProfiles,
} from "@/lib/hooks";
import { addCircleMember } from "@/lib/mutations";
import { memberNetBalances, settlementPlanFor } from "@/lib/ledger";
import { formatMinor } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/circles/$circleId")({
  head: () => ({
    meta: [
      { title: "Circle — Settle" },
      { name: "description", content: "Shared expenses and balances for this circle." },
      { property: "og:title", content: "Circle — Settle" },
      { property: "og:description", content: "Shared expenses and who owes whom." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CircleDetail,
});

function CircleDetail() {
  const { circleId } = useParams({ from: "/_authenticated/circles/$circleId" });
  const { user } = useAuth();
  const me = user?.id ?? "";
  const circle = useCircle(circleId);
  const members = useCircleMembers(circleId);
  const profiles = useProfileMap();
  const expenses = useExpenses(circleId)
    .filter((e) => !e.deleted_at)
    .sort((a, b) => b.spent_on.localeCompare(a.spent_on));
  const participants = useParticipants();
  const { graph } = useLedger(me, circleId);
  const [addOpen, setAddOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [openExpense, setOpenExpense] = useState<string | null>(null);

  // Aggregated net position per member — derived from every expense share,
  // repayment and confirmed settlement in this circle. Expenses are untouched.
  const netBalances = useMemo(() => memberNetBalances(graph), [graph]);

  // Minimised settlement plan, narrowed to transactions that involve me:
  // debts between two other members never enter what I can see.
  const suggestions = useMemo(() => settlementPlanFor(graph, me), [graph, me]);

  if (!circle) {
    return (
      <AppShell title="Circle">
        <p className="card-soft p-6 text-sm text-muted-foreground">
          This circle isn't on your device yet. Reconnect to sync it.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`${circle.emoji} ${circle.name}`}
      subtitle={`${members.length} members · ${circle.currency}`}
      action={
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Add expense to this circle"
          className="tap grid place-items-center rounded-full border border-border bg-card"
        >
          <Plus className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
      }
    >
      <div className="space-y-6">
        <section aria-labelledby="balances" className="space-y-3">
          <h2 id="balances" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Net circle balances
          </h2>
          <ul className="card-soft divide-y divide-border overflow-hidden">
            {members.map((m) => {
              const value = netBalances.get(m.user_id) ?? 0;
              const isMe = m.user_id === me;
              return (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <PersonAvatar profile={profiles.get(m.user_id)} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {isMe ? "You" : displayName(profiles.get(m.user_id))}
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={`num block text-sm font-bold ${
                        value > 0 ? "text-due" : value < 0 ? "text-owe" : "text-muted-foreground"
                      }`}
                    >
                      {value === 0
                        ? "settled"
                        : `${value > 0 ? "+" : "−"}${formatMinor(
                            Math.abs(value),
                            circle.currency,
                          )}`}
                    </span>
                    <span className="block text-[0.7rem] text-muted-foreground">
                      {value === 0
                        ? "all square"
                        : value > 0
                          ? "gets back"
                          : "owes the circle"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => setMemberOpen(true)}
            className="tap inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border text-sm font-semibold text-muted-foreground"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" /> Add member
          </button>
        </section>

        {suggestions.length ? (
          <section aria-labelledby="simplify" className="space-y-3">
            <h2 id="simplify" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Simplest way to settle
            </h2>
            <ul className="card-soft divide-y divide-border overflow-hidden">
              {suggestions.map((edge) => (
                <li key={`${edge.debtor}-${edge.creditor}`} className="flex items-center gap-2 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-semibold">
                      {edge.debtor === me ? "You" : displayName(profiles.get(edge.debtor))}
                    </span>{" "}
                    → {edge.creditor === me ? "you" : displayName(profiles.get(edge.creditor))}
                  </span>
                  <span className="num shrink-0 font-bold">
                    {formatMinor(edge.amountMinor, circle.currency)}
                  </span>
                  {edge.debtor === me ? (
                    <Link
                      to="/settle/$personId"
                      params={{ personId: edge.creditor }}
                      className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground"
                    >
                      Settle
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="expenses" className="space-y-3">
          <h2 id="expenses" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Expenses
          </h2>
          {expenses.length ? (
            <ul className="card-soft divide-y divide-border overflow-hidden">
              {expenses.map((expense) => {
                const rows = participants.filter((p) => p.expense_id === expense.id);
                const myShare = rows.find((p) => p.user_id === me)?.share_minor ?? 0;
                const expanded = openExpense === expense.id;
                return (
                  <li key={expense.id}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpenExpense(expanded ? null : expense.id)}
                      className="tap flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
                        <Receipt className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{expense.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {expense.paid_by === me ? "You" : displayName(profiles.get(expense.paid_by))}{" "}
                          paid · {expense.spent_on} · {rows.length} sharing
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="num block text-sm font-bold">
                          {formatMinor(expense.amount_minor, expense.currency)}
                        </span>
                        <span className="num block text-xs text-muted-foreground">
                          {myShare
                            ? `your share ${formatMinor(myShare, expense.currency)}`
                            : "not shared with you"}
                        </span>
                      </span>
                    </button>
                    {expanded ? (
                      <ul className="space-y-1 border-t border-border bg-muted/40 px-4 py-3">
                        {rows.map((row) => (
                          <li key={row.id} className="flex items-center gap-2 text-xs">
                            <span className="min-w-0 flex-1 truncate">
                              {row.user_id === me ? "You" : displayName(profiles.get(row.user_id))}
                              {row.user_id === expense.paid_by ? " · paid" : ""}
                            </span>
                            <span className="num shrink-0 font-semibold">
                              {formatMinor(row.share_minor, expense.currency)}
                            </span>
                          </li>
                        ))}
                        {!rows.length ? (
                          <li className="text-xs text-muted-foreground">No split recorded.</li>
                        ) : null}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>

          ) : (
            <p className="card-soft p-5 text-sm text-muted-foreground">
              No expenses yet. Tap + to add the first one.
            </p>
          )}
        </section>
      </div>

      <AddSheet open={addOpen} onOpenChange={setAddOpen} defaultCircleId={circleId} />
      <AddMemberDialog open={memberOpen} onOpenChange={setMemberOpen} circleId={circleId} />
    </AppShell>
  );
}

function AddMemberDialog({
  open,
  onOpenChange,
  circleId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  circleId: string;
}) {
  const members = useCircleMembers(circleId);
  const profiles = useProfiles();
  const [query, setQuery] = useState("");
  const existing = new Set(members.map((m) => m.user_id));
  const results = profiles
    .filter((p) => !existing.has(p.id))
    .filter((p) =>
      query ? `${p.name} ${p.username ?? ""}`.toLowerCase().includes(query.toLowerCase()) : true,
    )
    .slice(0, 8);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-xl">Add member</DialogTitle>
          <DialogDescription className="text-xs">
            They'll see every expense in this circle.
          </DialogDescription>
        </DialogHeader>
        <Field label="Search people">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or username"
          />
        </Field>
        <ul className="space-y-1.5">
          {results.map((p) => (
            <li key={p.id}>
              <Button
                variant="outline"
                className="tap w-full justify-start gap-3 rounded-xl"
                onClick={async () => {
                  await addCircleMember(circleId, p.id);
                  toast.success(`${p.name} added`);
                  onOpenChange(false);
                }}
              >
                <PersonAvatar profile={p} size="sm" />
                <span className="min-w-0 truncate">{p.name}</span>
              </Button>
            </li>
          ))}
          {!results.length ? (
            <li className="rounded-xl bg-muted/60 px-3 py-4 text-center text-sm text-muted-foreground">
              Nobody left to add.
            </li>
          ) : null}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
