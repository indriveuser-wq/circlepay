import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PersonAvatar } from "./PersonAvatar";
import { useAuth } from "@/lib/auth";
import {
  displayName,
  useCircleMembers,
  useCircles,
  useProfileMap,
  useProfiles,
} from "@/lib/hooks";
import { createExpense, createLoan } from "@/lib/mutations";
import { formatMinor, splitByWeights, splitEvenly, toMinor } from "@/lib/money";
import { today, type SplitMethod } from "@/lib/db";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "food",
  "transport",
  "accommodation",
  "shopping",
  "bills",
  "entertainment",
  "groceries",
  "education",
  "other",
] as const;

const SPLITS: { value: SplitMethod; label: string }[] = [
  { value: "equal", label: "Equally" },
  { value: "exact", label: "Exact" },
  { value: "percent", label: "Percent" },
  { value: "shares", label: "Shares" },
];

type Mode = "expense" | "lend" | "borrow";

export function AddSheet({
  open,
  onOpenChange,
  defaultCircleId,
  defaultMode = "expense",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCircleId?: string | undefined;
  defaultMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(defaultMode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-lg overflow-y-auto rounded-3xl p-0 sm:rounded-3xl">
        <div className="sticky top-0 z-10 border-b border-border bg-card px-4 pb-3 pt-5 sm:px-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-display text-xl">Add a record</DialogTitle>
            <DialogDescription className="text-xs">
              Settle tracks who owes whom. It never moves money.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
            {(
              [
                ["expense", "Expense"],
                ["lend", "I lent"],
                ["borrow", "I borrowed"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  "rounded-lg px-2 py-2 text-xs font-semibold transition-colors",
                  mode === value
                    ? "bg-card text-foreground shadow-card"
                    : "text-muted-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-6 pt-4">
          {mode === "expense" ? (
            <ExpenseForm
              defaultCircleId={defaultCircleId}
              onDone={() => onOpenChange(false)}
            />
          ) : (
            <LoanForm direction={mode} onDone={() => onOpenChange(false)} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

function ExpenseForm({
  defaultCircleId,
  onDone,
}: {
  defaultCircleId?: string | undefined;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const me = user?.id ?? "";
  const circles = useCircles().filter((c) => !c.archived);
  const [circleId, setCircleId] = useState(defaultCircleId ?? circles[0]?.id ?? "");
  const activeCircle = circles.find((c) => c.id === circleId) ?? circles[0];
  const members = useCircleMembers(activeCircle?.id);
  const profiles = useProfileMap();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("food");
  const [date, setDate] = useState(today());
  const [paidBy, setPaidBy] = useState(me);
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal");
  const [selected, setSelected] = useState<string[] | null>(null);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const memberIds = useMemo(() => members.map((m) => m.user_id), [members]);
  const participants = selected ?? memberIds;
  const amountMinor = toMinor(amount);

  const shares = useMemo(() => {
    if (!participants.length || amountMinor <= 0) return [];
    if (splitMethod === "equal") {
      const parts = splitEvenly(amountMinor, participants.length);
      return participants.map((id, i) => ({ userId: id, shareMinor: parts[i] ?? 0 }));
    }
    if (splitMethod === "exact") {
      return participants.map((id) => ({ userId: id, shareMinor: toMinor(weights[id] ?? "") }));
    }
    const raw = participants.map((id) => Number(weights[id] ?? "0") || 0);
    const parts = splitByWeights(amountMinor, raw);
    return participants.map((id, i) => ({ userId: id, shareMinor: parts[i] ?? 0 }));
  }, [participants, amountMinor, splitMethod, weights]);

  const sharesTotal = shares.reduce((sum, s) => sum + s.shareMinor, 0);
  const balanced = amountMinor > 0 && sharesTotal === amountMinor;

  if (!circles.length) {
    return (
      <div className="rounded-2xl bg-muted/60 p-6 text-center">
        <p className="font-semibold">You need a circle first</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Circles group shared expenses with friends, family or roommates.
        </p>
      </div>
    );
  }

  async function submit() {
    if (!activeCircle) return;
    if (!title.trim()) {
      toast.error("Give the expense a title.");
      return;
    }
    if (amountMinor <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    if (!balanced) {
      toast.error("The split doesn't add up to the total yet.");
      return;
    }
    setBusy(true);
    try {
      await createExpense({
        circleId: activeCircle.id,
        createdBy: me,
        title: title.trim(),
        amountMinor,
        currency: activeCircle.currency,
        category,
        spentOn: date,
        paidBy,
        splitMethod,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        shares: shares.filter((s) => s.shareMinor > 0),
      });
      toast.success("Expense saved on this device", {
        description: "It syncs automatically when you're online.",
      });
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the expense.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label={`Amount (${activeCircle?.currency ?? "NPR"})`}>
        <div className="flex items-center gap-2 rounded-2xl border border-input bg-card px-4 py-3">
          <span className="shrink-0 text-lg font-semibold text-muted-foreground">
            {activeCircle?.currency ?? "NPR"}
          </span>
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="5000"
            className="num h-12 min-w-0 flex-1 border-0 bg-transparent p-0 text-right text-3xl font-bold shadow-none focus-visible:ring-0 sm:text-4xl"
          />
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Circle" className="sm:col-span-2">
          <select
            className="tap w-full rounded-xl border border-input bg-card px-3 text-sm"
            value={activeCircle?.id ?? ""}
            onChange={(e) => setCircleId(e.target.value)}
          >
            {circles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Dinner at Trisara"
            maxLength={80}
          />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>


      <Field label="Category">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium capitalize",
                category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Paid by">
        <div className="flex flex-wrap gap-1.5">
          {memberIds.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPaidBy(id)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium",
                paidBy === id ? "border-primary bg-secondary" : "border-border bg-card",
              )}
            >
              <PersonAvatar profile={profiles.get(id)} size="sm" className="h-6 w-6 text-[9px]" />
              {id === me ? "You" : displayName(profiles.get(id))}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Split">
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1">
          {SPLITS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSplitMethod(s.value)}
              className={cn(
                "rounded-lg px-1 py-1.5 text-xs font-semibold",
                splitMethod === s.value ? "bg-card shadow-card" : "text-muted-foreground",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Field>

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {memberIds.map((id) => {
          const included = participants.includes(id);
          const share = shares.find((s) => s.userId === id)?.shareMinor ?? 0;
          return (
            <li key={id} className="flex items-center gap-3 bg-card px-3 py-2.5">
              <input
                type="checkbox"
                checked={included}
                aria-label={`Include ${displayName(profiles.get(id))}`}
                onChange={(e) => {
                  const base = participants;
                  setSelected(
                    e.target.checked ? [...base, id] : base.filter((x) => x !== id),
                  );
                }}
                className="h-4.5 w-4.5 shrink-0 rounded border-input"
              />
              <PersonAvatar profile={profiles.get(id)} size="sm" className="shrink-0" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {id === me ? "You" : displayName(profiles.get(id))}
              </span>
              {included && splitMethod !== "equal" ? (
                <Input
                  inputMode="decimal"
                  value={weights[id] ?? ""}
                  onChange={(e) => setWeights({ ...weights, [id]: e.target.value })}
                  placeholder={splitMethod === "percent" ? "%" : splitMethod === "shares" ? "1" : "0"}
                  className="h-9 w-14 shrink-0 text-right sm:w-20"
                />
              ) : null}
              <span className="num w-20 shrink-0 text-right text-xs text-muted-foreground sm:w-24 sm:text-sm">
                {included ? formatMinor(share, activeCircle?.currency) : "—"}
              </span>

            </li>
          );
        })}
      </ul>

      <p
        className={cn(
          "rounded-xl px-3 py-2 text-xs font-medium",
          balanced ? "bg-due-soft text-due" : "bg-pending-soft text-pending-foreground",
        )}
        role="status"
      >
        {balanced
          ? `Split adds up to ${formatMinor(amountMinor, activeCircle?.currency)}.`
          : `Assigned ${formatMinor(sharesTotal, activeCircle?.currency)} of ${formatMinor(
              amountMinor,
              activeCircle?.currency,
            )}.`}
      </p>

      <Field label="Notes (optional)">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={400}
          placeholder="Anything worth remembering"
        />
      </Field>

      <Button onClick={submit} disabled={busy} className="tap w-full rounded-xl">
        {busy ? "Saving…" : "Save expense"}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LoanForm({ direction, onDone }: { direction: "lend" | "borrow"; onDone: () => void }) {
  const { user } = useAuth();
  const me = user?.id ?? "";
  const profiles = useProfiles().filter((p) => p.id !== me);
  const [query, setQuery] = useState("");
  const [personId, setPersonId] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [dueOn, setDueOn] = useState(today());
  const [hasDue, setHasDue] = useState(false);

  const [busy, setBusy] = useState(false);

  const results = profiles
    .filter((p) =>
      query
        ? `${p.name} ${p.username ?? ""}`.toLowerCase().includes(query.toLowerCase())
        : true,
    )
    .slice(0, 6);

  async function submit() {
    const amountMinor = toMinor(amount);
    if (!personId) {
      toast.error("Pick a person first.");
      return;
    }
    if (amountMinor <= 0) {
      toast.error("Enter an amount greater than zero.");
      return;
    }
    setBusy(true);
    try {
      await createLoan({
        createdBy: me,
        lenderId: direction === "lend" ? me : personId,
        borrowerId: direction === "lend" ? personId : me,
        amountMinor,
        currency: "NPR",
        ...(purpose.trim() ? { purpose: purpose.trim() } : {}),
        dueOn: hasDue && dueOn ? dueOn : null,
      });
      toast.success(direction === "lend" ? "Loan recorded" : "Borrowing recorded");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save this.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Field label="Amount (NPR)">
        <div className="flex items-center gap-2 rounded-2xl border border-input bg-card px-4 py-3">
          <span className="shrink-0 text-lg font-semibold text-muted-foreground">Rs</span>
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="5000"
            className="num h-12 min-w-0 flex-1 border-0 bg-transparent p-0 text-right text-3xl font-bold shadow-none focus-visible:ring-0 sm:text-4xl"
          />
        </div>
      </Field>

      <Field label={direction === "lend" ? "Lent to" : "Borrowed from"}>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or username"
        />
      </Field>
      <ul className="space-y-1.5">
        {results.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setPersonId(p.id)}
              className={cn(
                "tap flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left",
                personId === p.id ? "border-primary bg-secondary" : "border-border bg-card",
              )}
            >
              <PersonAvatar profile={p} size="sm" className="shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{p.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{p.username}
                </span>
              </span>
            </button>
          </li>
        ))}
        {!results.length ? (
          <li className="rounded-xl bg-muted/60 px-3 py-4 text-center text-sm text-muted-foreground">
            No one found. People appear here once they join Settle.
          </li>
        ) : null}
      </ul>

      <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <Label htmlFor="due-toggle" className="min-w-0 text-sm font-semibold">
            Set a due date
          </Label>
          <Switch
            id="due-toggle"
            checked={hasDue}
            onCheckedChange={setHasDue}
            className="shrink-0"
          />
        </div>
        {hasDue ? (
          <Input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
        ) : (
          <p className="text-xs text-muted-foreground">No due date — this stays open-ended.</p>
        )}
      </div>


      <Field label="Purpose (optional)">
        <Input
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          maxLength={120}
          placeholder="Emergency loan"
        />
      </Field>

      <Button onClick={submit} disabled={busy} className="tap w-full rounded-xl">
        {busy ? "Saving…" : direction === "lend" ? "Record loan" : "Record borrowing"}
      </Button>
    </div>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
