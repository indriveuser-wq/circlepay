import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  CloudOff,
  QrCode,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Settle — Shared expenses, loans & settlement confirmations" },
      {
        name: "description",
        content:
          "Track shared expenses, private circles and personal loans offline. Save payment QRs, mark payments as sent and let the lender confirm before anything is settled.",
      },
      { property: "og:title", content: "Settle — Shared expenses that actually get settled" },
      {
        property: "og:description",
        content:
          "An offline-first ledger for friends, roommates and family. Two-sided settlement confirmation. No money is ever held or processed.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Users,
    title: "Private circles",
    body: "Trips, flats, families. Split evenly, by shares, percentages or exact amounts.",
  },
  {
    icon: Wallet,
    title: "Personal lending",
    body: "Record what you lent and borrowed, with due dates and partial repayments.",
  },
  {
    icon: QrCode,
    title: "Your payment QRs",
    body: "Save the QRs people should pay to. Cached on device so they work offline.",
  },
  {
    icon: BadgeCheck,
    title: "Confirmed settlements",
    body: "The borrower marks a payment as sent. It only clears once the lender confirms.",
  },
  {
    icon: CloudOff,
    title: "Offline-first",
    body: "Everything is written to your device instantly and syncs when you're back online.",
  },
  {
    icon: ShieldCheck,
    title: "No money held",
    body: "Settle is a ledger. Payments happen in your own bank or wallet app.",
  },
];

function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-bold">Settle</span>
        </div>
        <Link
          to="/auth"
          className="tap inline-flex items-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="py-10 sm:py-16">
          <p className="inline-flex items-center gap-2 rounded-full bg-due-soft px-3 py-1.5 text-xs font-semibold text-due">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Ledger only — never holds your money
          </p>
          <h1 className="mt-5 max-w-2xl font-display text-4xl font-extrabold leading-[1.05] sm:text-6xl">
            Shared expenses that actually get settled.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Split costs with your circles, track personal loans, and close the loop with a
            two-sided confirmation: they mark it paid, you confirm it landed.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="tap inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lift"
            >
              Get started free <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#how"
              className="tap inline-flex items-center rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold"
            >
              How settling works
            </a>
          </div>
        </section>

        <section
          aria-labelledby="features"
          className="grid gap-3 pb-24 sm:grid-cols-2 sm:pb-0 lg:grid-cols-3"
        >
          <h2 id="features" className="sr-only">
            Features
          </h2>
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              style={{ "--stack-i": i, zIndex: i + 1 } as React.CSSProperties}
              className="card-soft stack-card animate-fade-in p-5"
            >
              <f.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-base font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </section>


        <section id="how" className="mt-16 rounded-3xl bg-surface p-6 sm:p-10">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">
            The settlement handshake
          </h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["1", "Scan & pay", "Open the saved QR and pay in your own wallet or bank app."],
              [
                "2",
                "Mark as paid",
                "The payer logs the reference and amount. The debt moves to payment pending.",
              ],
              [
                "3",
                "Lender confirms",
                "Only the person receiving the money can mark it settled — or reject it.",
              ],
            ].map(([step, title, body]) => (
              <li key={step} className="card-soft p-5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {step}
                </span>
                <h3 className="mt-3 font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Settle keeps a record of who owes whom. It never processes, holds or transfers money.
      </footer>
    </div>
  );
}
