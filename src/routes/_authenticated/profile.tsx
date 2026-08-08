import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { LogOut, Star, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Field } from "@/components/AddSheet";
import { QrView } from "@/components/QrView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { usePaymentMethods, useProfile } from "@/lib/hooks";
import {
  deletePaymentMethod,
  savePaymentMethod,
  setPreferredPaymentMethod,
  updateProfile,
} from "@/lib/mutations";
import { isOnline } from "@/lib/sync";
import { uploadImage } from "@/lib/upload";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile & payment QRs — Settle" },
      { name: "description", content: "Save the payment QRs people should use to pay you." },
      { property: "og:title", content: "Your profile & payment QRs — Settle" },
      { property: "og:description", content: "Manage your details and payment methods." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const me = user?.id ?? "";
  const profile = useProfile(me);
  const methods = usePaymentMethods(me).filter((m) => m.is_active);
  const navigate = useNavigate();

  const [name, setName] = useState(profile?.name ?? "");
  const [provider, setProvider] = useState("eSewa");
  const [account, setAccount] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <AppShell title="Profile" subtitle={profile?.username ? `@${profile.username}` : undefined}>
      <div className="space-y-6">
        <section className="card-soft space-y-3 p-4">
          <Field label="Display name">
            <Input
              value={name || profile?.name || ""}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </Field>
          <Field label="Username (how people add you to circles)">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">@</span>
              <Input
                value={username}
                onChange={(e) => {
                  setUsername(normalizeUsername(e.target.value));
                  setUsernameError(null);
                }}
                placeholder={profile?.username ?? "yourname"}
                inputMode="text"
                autoCapitalize="none"
                autoComplete="username"
                maxLength={20}
                aria-invalid={usernameError ? true : undefined}
              />
            </div>
          </Field>
          {usernameError ? (
            <p className="text-xs font-medium text-destructive">{usernameError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              3–20 characters: lowercase letters, numbers, underscores. Must be unique.
            </p>
          )}
          <Button
            variant="outline"
            disabled={savingProfile}
            className="tap w-full rounded-xl"
            onClick={async () => {
              setSavingProfile(true);
              try {
                const nextName = name.trim() || profile?.name || "";
                if (nextName !== profile?.name) await updateProfile(me, { name: nextName });

                const nextUsername = normalizeUsername(username);
                if (nextUsername && nextUsername !== (profile?.username ?? "")) {
                  const problem = validateUsername(nextUsername);
                  if (problem) {
                    setUsernameError(problem);
                    toast.error(problem);
                    return;
                  }
                  await changeUsername(me, nextUsername);
                }
                toast.success("Profile updated");
              } catch (err) {
                const message = err instanceof Error ? err.message : "Could not save profile";
                setUsernameError(message);
                toast.error(message);
              } finally {
                setSavingProfile(false);
              }
            }}
          >
            Save profile
          </Button>
        </section>


        <section aria-labelledby="pm" className="space-y-3">
          <h2 id="pm" className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Payment QRs
          </h2>
          <p className="text-xs text-muted-foreground">
            These are shown to people settling up with you. Settle never processes payments.
          </p>

          {methods.map((m) => (
            <article key={m.id} className="card-soft space-y-3 p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{m.provider}</p>
                  {m.account_identifier ? (
                    <p className="num truncate text-xs text-muted-foreground">
                      {m.account_identifier}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label={`Make ${m.provider} preferred`}
                    onClick={() => void setPreferredPaymentMethod(me, m.id)}
                    className={`tap grid place-items-center rounded-xl border ${
                      m.is_preferred ? "border-primary bg-secondary" : "border-border"
                    }`}
                  >
                    <Star className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${m.provider}`}
                    onClick={() => void deletePaymentMethod(m.id)}
                    className="tap grid place-items-center rounded-xl border border-border"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <QrView path={m.qr_path} provider={m.provider} accountLabel={m.account_identifier} />
              <input
                type="file"
                accept="image/*"
                aria-label={`Upload QR for ${m.provider}`}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-xs file:font-semibold"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!isOnline()) {
                    toast.error("Connect to the internet to upload a QR.");
                    return;
                  }
                  const { path } = await uploadImage("payment-qr", me, file);
                  await savePaymentMethod({
                    id: m.id,
                    userId: me,
                    provider: m.provider,
                    label: m.label,
                    accountIdentifier: m.account_identifier,
                    qrPath: path,
                  });
                  toast.success("QR updated");
                }}
              />
            </article>
          ))}

          <article className="card-soft space-y-3 p-4">
            <p className="font-semibold">Add a payment method</p>
            <Field label="Provider">
              <Input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="eSewa, Khalti, bank…"
                maxLength={40}
              />
            </Field>
            <Field label="Account / phone (optional)">
              <Input
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                maxLength={60}
              />
            </Field>
            <Button
              disabled={busy}
              className="tap w-full rounded-xl"
              onClick={async () => {
                if (!provider.trim()) {
                  toast.error("Name the provider first.");
                  return;
                }
                setBusy(true);
                try {
                  await savePaymentMethod({
                    userId: me,
                    provider: provider.trim(),
                    accountIdentifier: account.trim() || null,
                    isPreferred: methods.length === 0,
                  });
                  setAccount("");
                  toast.success("Payment method added — now upload its QR.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Add method
            </Button>
          </article>
        </section>

        <Button
          variant="outline"
          className="tap w-full rounded-xl"
          onClick={async () => {
            await signOut();
            void navigate({ to: "/auth", replace: true });
          }}
        >
          <LogOut className="mr-1.5 h-4 w-4" aria-hidden="true" /> Sign out
        </Button>
      </div>
    </AppShell>
  );
}
