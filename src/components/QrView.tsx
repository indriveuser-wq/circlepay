import { useState } from "react";
import { Maximize2, QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useCachedImage } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function QrView({
  path,
  provider,
  accountLabel,
  className,
}: {
  path: string | null;
  provider: string;
  accountLabel?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const src = useCachedImage("payment-qr", path);

  if (!path) {
    return (
      <div
        className={cn(
          "grid aspect-square w-full place-items-center rounded-2xl border border-dashed border-border bg-muted/50 p-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        <div>
          <QrCode className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
          No QR uploaded for {provider} yet.
        </div>
      </div>
    );
  }

  if (!src) {
    return (
      <div
        className={cn(
          "grid aspect-square w-full place-items-center rounded-2xl bg-muted p-6 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        QR not cached on this device yet — connect once to save it for offline use.
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Open ${provider} QR code full screen`}
        className={cn(
          "group relative block w-full overflow-hidden rounded-2xl border border-border bg-white p-3",
          className,
        )}
      >
        <img src={src} alt={`${provider} payment QR code`} className="w-full rounded-xl" />
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-foreground/80 px-2 py-1 text-[11px] font-semibold text-background">
          <Maximize2 className="h-3 w-3" aria-hidden="true" /> Full screen
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="text-center text-base">
            {provider}
            {accountLabel ? ` · ${accountLabel}` : ""}
          </DialogTitle>
          <img
            src={src}
            alt={`${provider} payment QR code, full screen`}
            className="w-full rounded-2xl border border-border bg-white p-3"
          />
          <p className="text-center text-xs text-muted-foreground">
            Scan this in your own payment app. Settle never processes or holds money.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
