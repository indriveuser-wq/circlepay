import { CheckCircle2, CloudOff, RefreshCw, TriangleAlert, UploadCloud } from "lucide-react";
import { useSyncStatus } from "@/lib/hooks";
import { sync } from "@/lib/sync";
import { cn } from "@/lib/utils";

export function SyncBadge({ className }: { className?: string }) {
  const status = useSyncStatus();

  const map = {
    synced: {
      icon: CheckCircle2,
      label: "Synced",
      tone: "bg-due-soft text-due",
      detail: "All your changes are saved.",
    },
    syncing: {
      icon: RefreshCw,
      label: "Syncing",
      tone: "bg-secondary text-secondary-foreground",
      detail: "Sending your changes.",
    },
    pending: {
      icon: UploadCloud,
      label: `${status.pending} pending`,
      tone: "bg-pending-soft text-pending-foreground",
      detail: "Saved on this device, waiting to sync.",
    },
    offline: {
      icon: CloudOff,
      label: "Offline",
      tone: "bg-muted text-muted-foreground",
      detail: "You're offline. Changes sync when you reconnect.",
    },
    error: {
      icon: TriangleAlert,
      label: "Sync issue",
      tone: "bg-owe-soft text-owe",
      detail: "We couldn't sync. Your data is safe on this device.",
    },
  } as const;

  const view = map[status.state];
  const Icon = view.icon;

  return (
    <button
      type="button"
      onClick={() => void sync()}
      title={view.detail}
      aria-label={`${view.label}. ${view.detail} Tap to retry.`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors",
        view.tone,
        className,
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", status.state === "syncing" && "animate-spin")} />
      <span>{view.label}</span>
    </button>
  );
}
