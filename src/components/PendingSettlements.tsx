import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { PersonAvatar } from "./PersonAvatar";
import { useCachedImage, displayName, useProfileMap, useSettlements } from "@/lib/hooks";
import { confirmSettlement, rejectSettlement } from "@/lib/mutations";
import { formatMinor } from "@/lib/money";
import type { Settlement } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PendingSettlements({ userId }: { userId: string }) {
  const settlements = useSettlements();
  const incoming = settlements
    .filter((s) => s.state === "payment_pending" && s.payee_id === userId)
    .sort((a, b) => b.marked_paid_at.localeCompare(a.marked_paid_at));
  const outgoing = settlements
    .filter((s) => s.state === "payment_pending" && s.payer_id === userId)
    .sort((a, b) => b.marked_paid_at.localeCompare(a.marked_paid_at));

  if (!incoming.length && !outgoing.length) return null;

  return (
    <section aria-labelledby="pending-heading" className="space-y-3">
      <h2 id="pending-heading" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
        Awaiting confirmation
      </h2>
      {incoming.map((s) => (
        <ConfirmCard key={s.id} settlement={s} userId={userId} />
      ))}
      {outgoing.map((s) => (
        <WaitingCard key={s.id} settlement={s} />
      ))}
    </section>
  );
}

function ConfirmCard({ settlement, userId }: { settlement: Settlement; userId: string }) {
  const profiles = useProfileMap();
  const payer = profiles.get(settlement.payer_id);
  const proof = useCachedImage("payment-proofs", settlement.proof_path);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(fn: () => Promise<void>, message: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update this.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="card-soft overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <PersonAvatar profile={payer} />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <span className="font-semibold">{displayName(payer)}</span> says they sent you{" "}
            <span className="num font-bold text-due">
              {formatMinor(settlement.amount_minor, settlement.currency)}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {settlement.method_provider ? `${settlement.method_provider} · ` : ""}
            {settlement.paid_on}
            {settlement.reference ? ` · ref ${settlement.reference}` : ""}
          </p>
          {settlement.note ? (
            <p className="mt-1 text-xs text-muted-foreground">“{settlement.note}”</p>
          ) : null}
          {proof ? (
            <img
              src={proof}
              alt="Payment screenshot shared by the payer"
              className="mt-3 max-h-56 rounded-xl border border-border object-contain"
            />
          ) : null}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-pending-soft px-2 py-1 text-[11px] font-semibold text-pending-foreground">
          <Clock3 className="h-3 w-3" aria-hidden="true" /> Pending
        </span>
      </div>

      {rejecting ? (
        <div className="space-y-2 border-t border-border bg-muted/40 p-4">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why can't you confirm it? (e.g. nothing received yet)"
            maxLength={160}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="tap flex-1 rounded-xl"
              onClick={() => setRejecting(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              className="tap flex-1 rounded-xl"
              onClick={() =>
                void act(
                  () => rejectSettlement(settlement, userId, reason.trim()),
                  "Marked as not received",
                )
              }
            >
              Confirm rejection
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 border-t border-border bg-muted/40 p-3">
          <Button
            variant="outline"
            className="tap flex-1 rounded-xl"
            onClick={() => setRejecting(true)}
          >
            <XCircle className="mr-1.5 h-4 w-4" aria-hidden="true" /> Not received
          </Button>
          <Button
            disabled={busy}
            className="tap flex-1 rounded-xl"
            onClick={() =>
              void act(() => confirmSettlement(settlement, userId), "Settled — nice and clean")
            }
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" /> Confirm received
          </Button>
        </div>
      )}
    </article>
  );
}

function WaitingCard({ settlement }: { settlement: Settlement }) {
  const profiles = useProfileMap();
  const payee = profiles.get(settlement.payee_id);
  return (
    <article className="card-soft flex items-center gap-3 p-4">
      <PersonAvatar profile={payee} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          Waiting for <span className="font-semibold">{displayName(payee)}</span> to confirm{" "}
          <span className="num font-bold">
            {formatMinor(settlement.amount_minor, settlement.currency)}
          </span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Marked paid on {settlement.paid_on}
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-pending-soft px-2 py-1 text-[11px] font-semibold text-pending-foreground">
        <Clock3 className="h-3 w-3" aria-hidden="true" /> Pending
      </span>
    </article>
  );
}
