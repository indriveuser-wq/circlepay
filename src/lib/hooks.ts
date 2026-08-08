import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";
import { db, type Profile } from "./db";
import { buildDebtGraph, netBalanceFor } from "./ledger";
import { cacheFile, getSyncStatus, subscribeSync, type SyncStatus } from "./sync";

export function useProfiles(): Profile[] {
  return useLiveQuery(() => db.profiles.toArray(), [], [] as Profile[]) ?? [];
}

export function useProfileMap(): Map<string, Profile> {
  const profiles = useProfiles();
  return useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
}

export function useProfile(id: string | undefined): Profile | undefined {
  return useLiveQuery(() => (id ? db.profiles.get(id) : undefined), [id]);
}

export function useCircles() {
  return useLiveQuery(() => db.circles.toArray(), [], []) ?? [];
}

export function useCircle(id: string | undefined) {
  return useLiveQuery(() => (id ? db.circles.get(id) : undefined), [id]);
}

export function useCircleMembers(circleId?: string) {
  return (
    useLiveQuery(
      () =>
        circleId
          ? db.circle_members.where("circle_id").equals(circleId).toArray()
          : db.circle_members.toArray(),
      [circleId],
      [],
    ) ?? []
  );
}

export function useExpenses(circleId?: string) {
  return (
    useLiveQuery(
      () =>
        circleId
          ? db.expenses.where("circle_id").equals(circleId).toArray()
          : db.expenses.toArray(),
      [circleId],
      [],
    ) ?? []
  );
}

export function useParticipants() {
  return useLiveQuery(() => db.expense_participants.toArray(), [], []) ?? [];
}

export function useLoans() {
  return useLiveQuery(() => db.loans.toArray(), [], []) ?? [];
}

export function useRepayments() {
  return useLiveQuery(() => db.loan_repayments.toArray(), [], []) ?? [];
}

export function useSettlements() {
  return useLiveQuery(() => db.settlements.toArray(), [], []) ?? [];
}

export function useNotifications(userId: string) {
  return (
    useLiveQuery(
      () => db.notifications.where("user_id").equals(userId).toArray(),
      [userId],
      [],
    ) ?? []
  );
}

export function useFriends(userId: string) {
  const rows = useLiveQuery(() => db.friends.toArray(), [], []) ?? [];
  return useMemo(() => {
    const added = rows.filter((r) => r.user_id === userId);
    const addedMe = rows.filter((r) => r.friend_id === userId);
    const addedIds = new Set(added.map((r) => r.friend_id));
    return {
      rows,
      added,
      addedMe,
      mutual: addedMe.filter((r) => addedIds.has(r.user_id)),
      isFriend: (id: string) => addedIds.has(id),
    };
  }, [rows, userId]);
}

export function useActivity() {
  return useLiveQuery(() => db.activity_events.toArray(), [], []) ?? [];
}

export function usePaymentMethods(userId?: string) {
  return (
    useLiveQuery(
      () =>
        userId
          ? db.payment_methods.where("user_id").equals(userId).toArray()
          : db.payment_methods.toArray(),
      [userId],
      [],
    ) ?? []
  );
}

export function useLedger(userId: string, circleId?: string) {
  const expenses = useExpenses();
  const participants = useParticipants();
  const loans = useLoans();
  const repayments = useRepayments();
  const settlements = useSettlements();

  return useMemo(() => {
    const graph = buildDebtGraph(
      { expenses, participants, loans, repayments, settlements },
      circleId,
    );
    const balances = netBalanceFor(graph, userId);
    let owed = 0;
    let owing = 0;
    for (const value of balances.values()) {
      if (value > 0) owed += value;
      else owing += -value;
    }
    return { graph, balances, totalOwedToMe: owed, totalIOwe: owing };
  }, [expenses, participants, loans, repayments, settlements, userId, circleId]);
}

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());
  useEffect(() => subscribeSync(setStatus), []);
  return status;
}

export function useCachedImage(bucket: string, path: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!path) {
      setSrc(null);
      return;
    }
    void cacheFile(bucket, path).then((value) => {
      if (active) setSrc(value);
    });
    return () => {
      active = false;
    };
  }, [bucket, path]);
  return src;
}

export function displayName(profile: Profile | undefined, fallback = "Someone"): string {
  if (!profile) return fallback;
  return profile.name || profile.username || fallback;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
