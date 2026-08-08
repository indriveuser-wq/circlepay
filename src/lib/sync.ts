import { supabase } from "@/integrations/supabase/client";
import {
  db,
  getClientId,
  newId,
  nowIso,
  type OutboxEntry,
  type OutboxTable,
  type SyncState,
} from "./db";

type Listener = (status: SyncStatus) => void;

export interface SyncStatus {
  state: SyncState;
  pending: number;
  lastSyncedAt: string | null;
  error: string | null;
}

let status: SyncStatus = {
  state: "synced",
  pending: 0,
  lastSyncedAt: null,
  error: null,
};

const listeners = new Set<Listener>();

export function getSyncStatus(): SyncStatus {
  return status;
}

export function subscribeSync(listener: Listener): () => void {
  listeners.add(listener);
  listener(status);
  return () => listeners.delete(listener);
}

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l(status));
}

export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/** Local-first write: commit to IndexedDB, then queue for the server. */
export async function enqueue(
  table: OutboxTable,
  op: OutboxEntry["op"],
  rowId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await db.outbox.add({
    id: newId(),
    table,
    op,
    rowId,
    payload,
    clientId: getClientId(),
    createdAt: nowIso(),
    attempts: 0,
    lastError: null,
  });
  await refreshPending();
  void sync();
}

async function refreshPending() {
  const pending = await db.outbox.count();
  if (pending === 0 && status.state === "pending") setStatus({ pending, state: "synced" });
  else setStatus({ pending });
}

const PULL_TABLES = [
  "profiles",
  "payment_methods",
  "circles",
  "circle_members",
  "expenses",
  "expense_participants",
  "loans",
  "loan_repayments",
  "settlements",
  "notifications",
  "activity_events",
] as const;

async function pushOutbox(): Promise<void> {
  const entries = await db.outbox.orderBy("seq").toArray();
  for (const entry of entries) {
    if (!entry.seq) continue;
    try {
      if (entry.op === "insert") {
        const { error } = await supabase
          .from(entry.table)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .upsert(entry.payload as any, { onConflict: "id" });
        if (error) throw error;
      } else if (entry.op === "update") {
        const { error } = await supabase
          .from(entry.table)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .update(entry.payload as any)
          .eq("id", entry.rowId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(entry.table).delete().eq("id", entry.rowId);
        if (error) throw error;
      }
      await db.outbox.delete(entry.seq);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.outbox.update(entry.seq, {
        attempts: entry.attempts + 1,
        lastError: message,
      });
      throw new Error(message);
    }
  }
}

async function pullAll(): Promise<void> {
  for (const table of PULL_TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw new Error(error.message);
    if (!data) continue;
    const local = db.table(table);
    const remoteIds = new Set(data.map((row) => (row as { id: string }).id));
    const pendingRows = await db.outbox.toArray();
    const pendingIds = new Set(pendingRows.filter((p) => p.table === table).map((p) => p.rowId));
    const stale = (await local.toCollection().primaryKeys()) as string[];
    const toDelete = stale.filter((id) => !remoteIds.has(id) && !pendingIds.has(id));
    if (toDelete.length) await local.bulkDelete(toDelete);
    await local.bulkPut(data);
  }
}

let running: Promise<void> | null = null;

export async function sync(): Promise<void> {
  if (typeof window === "undefined") return;
  if (running) return running;

  if (!isOnline()) {
    const pending = await db.outbox.count();
    setStatus({ state: "offline", pending });
    return;
  }

  running = (async () => {
    setStatus({ state: "syncing", error: null });
    try {
      await pushOutbox();
      await pullAll();
      const pending = await db.outbox.count();
      setStatus({
        state: pending > 0 ? "pending" : "synced",
        pending,
        lastSyncedAt: nowIso(),
        error: null,
      });
      await db.meta.put({ key: "lastSyncedAt", value: nowIso() });
    } catch (error) {
      const pending = await db.outbox.count();
      setStatus({
        state: isOnline() ? "error" : "offline",
        pending,
        error: error instanceof Error ? error.message : "Sync failed",
      });
    } finally {
      running = null;
    }
  })();

  return running;
}

let wired = false;

export function startSyncLoop(): () => void {
  if (typeof window === "undefined") return () => {};
  void sync();
  if (wired) return () => {};
  wired = true;

  const onOnline = () => void sync();
  const onOffline = () => setStatus({ state: "offline" });
  const onVisible = () => {
    if (document.visibilityState === "visible") void sync();
  };
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  document.addEventListener("visibilitychange", onVisible);
  const timer = window.setInterval(() => void sync(), 45_000);

  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
    document.removeEventListener("visibilitychange", onVisible);
    window.clearInterval(timer);
    wired = false;
  };
}

/** Downloads a private file once and caches it locally so QR codes work offline. */
export async function cacheFile(bucket: string, path: string): Promise<string | null> {
  const existing = await db.files.get(path);
  if (existing) return existing.dataUrl;
  if (!isOnline()) return null;
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(data);
  });
  await db.files.put({ path, bucket, dataUrl, cachedAt: nowIso() });
  return dataUrl;
}

export async function invalidateFile(path: string): Promise<void> {
  await db.files.delete(path);
}
