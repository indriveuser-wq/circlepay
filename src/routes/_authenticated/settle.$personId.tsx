import { createFileRoute, useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/AddSheet";
import { QrView } from "@/components/QrView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import {
  displayName,
  useLedger,
  useLoans,
  usePaymentMethods,
  useProfile,
  useRepayments,
} from "@/lib/hooks";
import { loanOutstanding } from "@/lib/ledger";
import { createSettlement } from "@/lib/mutations";
import { formatMinor, toMajor, toMinor } from "@/lib/money";
import { isOnline } from "@/lib/sync";
import { uploadImage } from "@/lib/upload";
import { today } from "@/lib/db";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settle/$personId")({
  head: () => ({
    meta: [
      { title: "Settle up — Settle" },
      { name: "description", content: "Pay outside the app, then mark the payment as sent." },
      { property: "og:title", content: "Settle up — Settle" },
      { property: "og:description", content: "Mark a payment as sent for confirmation." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { loanId?: string; circleId?: string } => ({
    loanId: typeof search["loanId"] === "string" ? (search["loanId"] as string) : undefined,
    circleId: typeof search["circleId"] === "string" ? (search["circleId"] as string) : undefined,
  }),
  component: SettlePage,
});

function SettlePage() {
  const { personId } = useParams({ from: "/_authenticated/settle/$personId" });
  const { loanId, circleId } = useSearch({ from: "/_authenticated/settle/$personId" });
  const navigate = useNavigate();
  const { user } = useAuth();
  const me = user?.id ?? "";
  const person = useProfile(personId);
  const methods = usePaymentMethods(personId)
    .filter((m) => m.is_active)
    .sort((a, b) => Number(b.is_preferred) - Number(a.is_preferred));
  const { balances } = useLedger(me, circleId);
  const loans = useLoans();
  const repayments = useRepayments();

  const loan = loanId ? loans.find((l) => l.id === loanId) : undefined;
  const suggested = loan
    ? loanOutstanding(loan, repayments)
    : Math.max(0, -(balances.get(personId) ?? 0));


  const [methodIndex, setMethodIndex] = useState(0);
  const [amount, setAmount] = useState(suggested > 0 ? String(toMajor(suggested)) : "");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [paidOn, setPaidOn] = useState(today());
  const [proofPath, setProofPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const method = methods[methodIndex];

  async function submit() {
    const amountMinor = toMinor(amount);
    if (amountMinor <= 0) {
      toast.error("Enter the amount you sent.");
      return;
    }
    setBusy(true);
    try {
      await createSettlement({
        payerId: me,
        payeeId: personId,
        amountMinor,
        currency: "NPR",
        circleId: circleId ?? null,
        loanId: loan?.id ?? null,
        methodProvider: method?.provider ?? null,
        reference: reference.trim() || null,
        note: note.trim() || null,
        proofPath,
        paidOn,
      });
      toast.success("Marked as paid", {
        description: `${displayName(person)} needs to confirm before it's settled.`,
      });
      void navigate({ to: "/people/$personId", params: { personId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't record that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={`Pay ${displayName(person)}`} subtitle="Settle records it — you pay in your own app">
      <div className="space-y-6">
        <p className="flex items-start gap-2 rounded-2xl bg-secondary p-3 text-xs text-secondary-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Settle never moves money. Send the payment with your own bank or wallet app, then mark it
          here so {displayName(person)} can confirm.
        </p>

        {methods.length ? (
          <section aria-labelledby="qr" className="space-y-3">
            <h2 id="qr" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Their payment QR
            </h2>
            {methods.length > 1 ? (
              <div className="flex flex-wrap gap-1.5">
                {methods.map((m, i) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethodIndex(i)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold",
                      i === methodIndex
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card",
                    )}
                  >
                    {m.provider}
                  </button>
                ))}
              </div>
            ) : null}
            <QrView
              path={method?.qr_path ?? null}
              provider={method?.provider ?? "payment"}
              accountLabel={method?.account_identifier ?? null}
            />
            {method?.account_identifier ? (
              <p className="num text-center text-sm font-semibold">{method.account_identifier}</p>
            ) : null}
          </section>
        ) : (
          <p className="card-soft p-5 text-sm text-muted-foreground">
            {displayName(person)} hasn't saved a payment QR yet. Pay them the way you normally do,
            then record it below.
          </p>
        )}

        <section aria-labelledby="mark" className="space-y-4">
          <h2 id="mark" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Mark as paid
          </h2>
          {suggested > 0 ? (
            <p className="num text-xs text-muted-foreground">
              Outstanding: {formatMinor(suggested)}
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount sent (NPR)">
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Date">
              <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
            </Field>
          </div>
          <Field label="Reference / transaction ID (optional)">
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={80}
            />
          </Field>
          <Field label="Note (optional)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} />
          </Field>
          <Field label="Payment screenshot (optional)">
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-xs file:font-semibold"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!isOnline()) {
                  toast.error("You're offline — you can add the screenshot later.");
                  return;
                }
                try {
                  const { path } = await uploadImage("payment-proofs", me, file);
                  setProofPath(path);
                  toast.success("Screenshot attached");
                } catch {
                  toast.error("Couldn't upload the screenshot.");
                }
              }}
            />
          </Field>
          <Button onClick={submit} disabled={busy} className="tap w-full rounded-xl">
            {busy ? "Saving…" : "I've sent the payment"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            This moves to <strong>payment pending</strong> until {displayName(person)} confirms.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
