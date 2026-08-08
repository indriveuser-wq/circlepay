import Dexie, { type Table } from "dexie";

export type SyncState = "synced" | "syncing" | "pending" | "error" | "offline";

export interface Profile {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  currency: string;
  timezone: string;
  notify_in_app: boolean;
  notify_push: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  user_id: string;
  provider: string;
  label: string | null;
  account_identifier: string | null;
  qr_path: string | null;
  is_preferred: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Circle {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  currency: string;
  owner_id: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export type SplitMethod = "equal" | "exact" | "percent" | "shares";

export interface Expense {
  id: string;
  circle_id: string;
  title: string;
  amount_minor: number;
  currency: string;
  category: string;
  spent_on: string;
  paid_by: string;
  split_method: SplitMethod;
  notes: string | null;
  receipt_path: string | null;
  created_by: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseParticipant {
  id: string;
  expense_id: string;
  user_id: string;
  share_minor: number;
  created_at: string;
}

export type LoanStatus = "active" | "partial" | "payment_pending" | "settled" | "overdue";

export interface Loan {
  id: string;
  lender_id: string;
  borrower_id: string;
  amount_minor: number;
  currency: string;
  purpose: string | null;
  lent_on: string;
  due_on: string | null;
  status: LoanStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LoanRepayment {
  id: string;
  loan_id: string;
  amount_minor: number;
  paid_on: string;
  note: string | null;
  recorded_by: string;
  created_at: string;
}

export type SettlementState = "payment_pending" | "settled" | "rejected";

export interface Settlement {
  id: string;
  payer_id: string;
  payee_id: string;
  circle_id: string | null;
  loan_id: string | null;
  amount_minor: number;
  currency: string;
  state: SettlementState;
  method_provider: string | null;
  reference: string | null;
  note: string | null;
  proof_path: string | null;
  paid_on: string;
  marked_paid_at: string;
  confirmed_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  kind: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

export interface ActivityEvent {
  id: string;
  actor_id: string;
  circle_id: string | null;
  counterparty_id: string | null;
  kind: string;
  summary: string;
  amount_minor: number | null;
  currency: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export type OutboxTable =
  | "profiles"
  | "payment_methods"
  | "circles"
  | "circle_members"
  | "expenses"
  | "expense_participants"
  | "loans"
  | "loan_repayments"
  | "settlements"
  | "notifications"
  | "activity_events";

export interface OutboxEntry {
  seq?: number;
  id: string;
  table: OutboxTable;
  op: "insert" | "update" | "delete";
  rowId: string;
  payload: Record<string, unknown>;
  clientId: string;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

/** Locally cached remote file (QR codes, proofs) so settling works offline. */
export interface CachedFile {
  path: string;
  bucket: string;
  dataUrl: string;
  cachedAt: string;
}

export interface MetaRow {
  key: string;
  value: string;
}

class SettleDB extends Dexie {
  profiles!: Table<Profile, string>;
  payment_methods!: Table<PaymentMethod, string>;
  circles!: Table<Circle, string>;
  circle_members!: Table<CircleMember, string>;
  expenses!: Table<Expense, string>;
  expense_participants!: Table<ExpenseParticipant, string>;
  loans!: Table<Loan, string>;
  loan_repayments!: Table<LoanRepayment, string>;
  settlements!: Table<Settlement, string>;
  notifications!: Table<AppNotification, string>;
  activity_events!: Table<ActivityEvent, string>;
  outbox!: Table<OutboxEntry, number>;
  files!: Table<CachedFile, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("settle-db");
    this.version(1).stores({
      profiles: "id, username, name",
      payment_methods: "id, user_id, is_preferred",
      circles: "id, owner_id, archived",
      circle_members: "id, circle_id, user_id",
      expenses: "id, circle_id, paid_by, spent_on, created_at",
      expense_participants: "id, expense_id, user_id",
      loans: "id, lender_id, borrower_id, status, due_on",
      loan_repayments: "id, loan_id",
      settlements: "id, payer_id, payee_id, state, circle_id",
      notifications: "id, user_id, read_at, created_at",
      activity_events: "id, actor_id, circle_id, created_at",
      outbox: "++seq, id, table, rowId",
      files: "path",
      meta: "key",
    });
  }
}

export const db = new SettleDB();

const CLIENT_KEY = "settle.client-id";

export function getClientId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(CLIENT_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(CLIENT_KEY, id);
  }
  return id;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function clearLocalData(): Promise<void> {
  await Promise.all([
    db.profiles.clear(),
    db.payment_methods.clear(),
    db.circles.clear(),
    db.circle_members.clear(),
    db.expenses.clear(),
    db.expense_participants.clear(),
    db.loans.clear(),
    db.loan_repayments.clear(),
    db.settlements.clear(),
    db.notifications.clear(),
    db.activity_events.clear(),
    db.outbox.clear(),
    db.files.clear(),
    db.meta.clear(),
  ]);
}
