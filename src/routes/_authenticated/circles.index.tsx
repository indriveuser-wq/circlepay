import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/AddSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { useCircleMembers, useCircles, useLedger } from "@/lib/hooks";
import { createCircle } from "@/lib/mutations";
import { formatMinor } from "@/lib/money";

export const Route = createFileRoute("/_authenticated/circles/")({
  head: () => ({
    meta: [
      { title: "Your circles — Settle" },
      { name: "description", content: "Private groups for trips, flats and families." },
      { property: "og:title", content: "Your circles — Settle" },
      { property: "og:description", content: "Shared expense groups you belong to." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CirclesPage,
});

const EMOJI = ["🧿", "🏔️", "🏠", "🍜", "✈️", "🎓", "🎉", "🚗", "☕", "💼"];

function CirclesPage() {
  const { user } = useAuth();
  const me = user?.id ?? "";
  const circles = useCircles().filter((c) => !c.archived);
  const members = useCircleMembers();
  const [open, setOpen] = useState(false);

  return (
    <AppShell
      title="Circles"
      subtitle={`${circles.length} active`}
      action={
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Create a circle"
          className="tap grid place-items-center rounded-full border border-border bg-card"
        >
          <Plus className="h-4.5 w-4.5" aria-hidden="true" />
        </button>
      }
    >
      {circles.length ? (
        <ul className="space-y-3">
          {circles.map((circle) => (
            <li key={circle.id}>
              <CircleCard
                id={circle.id}
                name={circle.name}
                emoji={circle.emoji}
                currency={circle.currency}
                memberCount={members.filter((m) => m.circle_id === circle.id).length}
                userId={me}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="card-soft p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
          <h2 className="mt-3 font-display text-lg font-bold">No circles yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A circle is a private group — a trip, a flat, a family — where expenses are shared.
          </p>
          <Button onClick={() => setOpen(true)} className="tap mt-5 rounded-xl">
            Create your first circle
          </Button>
        </div>
      )}

      <NewCircleDialog open={open} onOpenChange={setOpen} ownerId={me} />
    </AppShell>
  );
}

function CircleCard({
  id,
  name,
  emoji,
  currency,
  memberCount,
  userId,
}: {
  id: string;
  name: string;
  emoji: string;
  currency: string;
  memberCount: number;
  userId: string;
}) {
  const { totalOwedToMe, totalIOwe } = useLedger(userId, id);
  const net = totalOwedToMe - totalIOwe;

  return (
    <Link
      to="/circles/$circleId"
      params={{ circleId: id }}
      className="card-soft flex items-center gap-3 p-4"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary text-xl">
        {emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-base font-bold">{name}</span>
        <span className="block text-xs text-muted-foreground">
          {memberCount} member{memberCount === 1 ? "" : "s"}
        </span>
      </span>
      <span
        className={`num shrink-0 text-sm font-bold ${
          net > 0 ? "text-due" : net < 0 ? "text-owe" : "text-muted-foreground"
        }`}
      >
        {net === 0 ? "settled" : formatMinor(Math.abs(net), currency)}
      </span>
    </Link>
  );
}

function NewCircleDialog({
  open,
  onOpenChange,
  ownerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ownerId: string;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🧿");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) {
      toast.error("Give your circle a name.");
      return;
    }
    setBusy(true);
    try {
      await createCircle({
        ownerId,
        name: name.trim(),
        emoji,
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      toast.success("Circle created");
      setName("");
      setDescription("");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't create the circle.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="font-display text-xl">New circle</DialogTitle>
          <DialogDescription className="text-xs">
            Only people you add can see this circle's expenses.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Pokhara trip"
            />
          </Field>
          <Field label="Icon">
            <div className="flex flex-wrap gap-1.5">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  aria-label={`Use ${e}`}
                  className={`grid h-10 w-10 place-items-center rounded-xl border text-lg ${
                    emoji === e ? "border-primary bg-secondary" : "border-border bg-card"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Description (optional)">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={200}
            />
          </Field>
          <Button onClick={submit} disabled={busy} className="tap w-full rounded-xl">
            {busy ? "Creating…" : "Create circle"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
