import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, CalendarClock, HandCoins } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/AddSheet";
import { PersonAvatar } from "@/components/PersonAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import {
  displayName,
  useLedger,
  useLoans,
  useProfile,
  useRepayments,
  useSettlements,
} from "@/lib/hooks";
import { deriveLoanStatus, type LoanDisplayStatus } from "@/lib/ledger";
import { addRepayment } from "@/lib/mutations";
import { formatMinor, toMinor } from "@/lib/money";
import { today, type Loan } from "@/lib/db";

export const Route = createFileRoute("/_authenticated/people/$personId")({
  head: () => ({
    meta: [
      { title: "Person — Settle" },
      { name: "description", content: "Your balance, loans and settlements with this person." },
      { property: "og:title", content: "Person — Settle" },
      { property: "og:description", content: "Loans, expenses and settlement history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PersonPage,
});

const STATUS_STYLE: Record<LoanDisplayStatus, string> = {
  active: "bg-secondary text-secondary-foreground",
  partial: "bg-secondary text-secondary-foreground",
  payment_pending: "bg-pending-soft text-pending-foreground",
  settled: "bg-due-soft text-due",
  overdue: "bg-owe-soft text-owe",
};

const STATUS_LABEL: Record<LoanDisplayStatus, string> = {
  active: "Active",
  partial: "Partly repaid",
  payment_pending: "Payment pending",
  settled: "Settled",
  overdue: "Overdue",
};

function PersonPage() {
  const { personId } = useParams({ from: "/_authenticated/people/$personId" });
  const { user } = useAuth();
  const me = user?.id ?? "";
  const person = useProfile(personId);
  const { balances } = useLedger(me);
  const net = balances.get(personId) ?? 0;
  const loans = useLoans().filter(
    (l) =>
      (l.lender_id === me && l.borrower_id === personId) ||
      (l.borrower_id === me && l.lender_id === personId),
  );
  const repayments = useRepayments();
  const settlements = useSettlements().filter(
    (s) =>
      (s.payer_id === me && s.payee_id === personId) ||
      (s.payee_id === me && s.payer_id === personId),
  );
  const [repayFor, setRepayFor] = useState<Loan | null>(null);

  return (
    <AppShell title={displayName(person)} subtitle={person?.username ? `@${person.username}` : undefined}>
      <div className="space-y-6">
        <section className="card-soft flex items-center gap-4 p-5">
          <PersonAvatar profile={person} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Net balance
            </p>
            <p
              className={`num text-2xl font-extrabold ${
                net > 0 ? "text-due" : net < 0 ? "text-owe" : "text-muted-foreground"
              }`}
            >
              {net === 0 ? "All settled" : formatMinor(Math.abs(net))}
            </p>
            <p className="text-xs text-muted-foreground">
              {net > 0 ? "they owe you" : net < 0 ? "you owe them" : "nothing outstanding"}
            </p>
          </div>
          {net < 0 ? (
            <Link
              to="/settle/$personId"
              params={{ personId }}
              className="tap inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" /> Settle up
            </Link>
          ) : null}
        </section>

        <section aria-labelledby="loans" className="space-y-3">
          <h2 id="loans" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Loans
          </h2>
          {loans.length ? (
            <ul className="space-y-2.5">
              {loans.map((loan) => {
                const { status, outstanding } = deriveLoanStatus(loan, repayments, settlements);
                const iAmLender = loan.lender_id === me;
                return (
                  <li key={loan.id} className="card-soft p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {iAmLender ? "You lent" : "You borrowed"}{" "}
                          {formatMinor(loan.amount_minor, loan.currency)}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {loan.purpose ? `${loan.purpose} · ` : ""}from {loan.lent_on}
                        </p>
                        {loan.due_on ? (
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <CalendarClock className="h-3 w-3" aria-hidden="true" /> due{" "}
                            {loan.due_on}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLE[status]}`}
                      >
                        {STATUS_LABEL[status]}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                      <span className="num text-xs text-muted-foreground">
                        outstanding {formatMinor(outstanding, loan.currency)}
                      </span>
                      <div className="flex gap-2">
                        {iAmLender && outstanding > 0 ? (
                          <Button
                            variant="outline"
                            className="h-9 rounded-lg text-xs"
                            onClick={() => setRepayFor(loan)}
                          >
                            Record repayment
                          </Button>
                        ) : null}
                        {!iAmLender && outstanding > 0 && status !== "payment_pending" ? (
                          <Link
                            to="/settle/$personId"
                            params={{ personId }}
                            search={{ loanId: loan.id }}
                            className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground"
                          >
                            Pay & mark paid
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="card-soft p-5 text-sm text-muted-foreground">
              No personal loans with {displayName(person)} yet.
            </p>
          )}
        </section>

        <section aria-labelledby="history" className="space-y-3">
          <h2 id="history" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Settlement history
          </h2>
          {settlements.length ? (
            <ul className="card-soft divide-y divide-border overflow-hidden">
              {settlements
                .sort((a, b) => b.marked_paid_at.localeCompare(a.marked_paid_at))
                .map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                    <HandCoins className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-sm">
                      {s.payer_id === me ? "You paid" : "They paid you"} · {s.paid_on}
                    </span>
                    <span className="num shrink-0 text-sm font-semibold">
                      {formatMinor(s.amount_minor, s.currency)}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                        s.state === "settled"
                          ? "bg-due-soft text-due"
                          : s.state === "rejected"
                            ? "bg-owe-soft text-owe"
                            : "bg-pending-soft text-pending-foreground"
                      }`}
                    >
                      {s.state.replace("_", " ")}
                    </span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="card-soft p-5 text-sm text-muted-foreground">No settlements yet.</p>
          )}
        </section>
      </div>

      <RepaymentDialog loan={repayFor} onClose={() => setRepayFor(null)} userId={me} />
    </AppShell>
  );
}

function RepaymentDialog({
  loan,
  onClose,
  userId,
}: {
  loan: Loan | null;
  onClose: () => void;
  userId: string;
}) {
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today());
  const [busy, setBusy] = useState(false);

  return (
    <Dialog open={!!loan} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-xl">Record repayment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Amount received">
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1000"
            />
          </Field>
          <Field label="Date">
            <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </Field>
          <Button
            disabled={busy}
            className="tap w-full rounded-xl"
            onClick={async () => {
              if (!loan) return;
              const amountMinor = toMinor(amount);
              if (amountMinor <= 0) {
                toast.error("Enter an amount greater than zero.");
                return;
              }
              setBusy(true);
              try {
                await addRepayment({
                  loanId: loan.id,
                  amountMinor,
                  recordedBy: userId,
                  paidOn,
                });
                toast.success("Repayment recorded");
                setAmount("");
                onClose();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Couldn't save that.");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Save repayment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
