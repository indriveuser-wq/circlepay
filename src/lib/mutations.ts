import {
  db,
  newId,
  nowIso,
  today,
  type ActivityEvent,
  type AppNotification,
  type Circle,
  type CircleMember,
  type Expense,
  type ExpenseParticipant,
  type Friend,
  type Loan,
  type LoanRepayment,
  type PaymentMethod,
  type Profile,
  type Settlement,
  type SplitMethod,
} from "./db";
import { enqueue } from "./sync";

/* ------------------------------------------------------------------ */
/* Notifications + activity (every important state change is auditable) */
/* ------------------------------------------------------------------ */

export async function notify(input: {
  userId: string;
  actorId: string;
  kind: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  if (input.userId === input.actorId) return;
  const row: AppNotification = {
    id: newId(),
    user_id: input.userId,
    actor_id: input.actorId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    read_at: null,
    created_at: nowIso(),
  };
  await db.notifications.put(row);
  await enqueue("notifications", "insert", row.id, row as unknown as Record<string, unknown>);
}

export async function logActivity(input: {
  actorId: string;
  kind: string;
  summary: string;
  circleId?: string | null;
  counterpartyId?: string | null;
  amountMinor?: number | null;
  currency?: string | null;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  const row: ActivityEvent = {
    id: newId(),
    actor_id: input.actorId,
    circle_id: input.circleId ?? null,
    counterparty_id: input.counterpartyId ?? null,
    kind: input.kind,
    summary: input.summary,
    amount_minor: input.amountMinor ?? null,
    currency: input.currency ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    created_at: nowIso(),
  };
  await db.activity_events.put(row);
  await enqueue("activity_events", "insert", row.id, row as unknown as Record<string, unknown>);
}

export async function markNotificationRead(id: string): Promise<void> {
  const read_at = nowIso();
  await db.notifications.update(id, { read_at });
  await enqueue("notifications", "update", id, { read_at });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const rows = await db.notifications.where("user_id").equals(userId).toArray();
  for (const row of rows.filter((r) => !r.read_at)) await markNotificationRead(row.id);
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export async function updateProfile(id: string, patch: Partial<Profile>): Promise<void> {
  await db.profiles.update(id, { ...patch, updated_at: nowIso() });
  await enqueue("profiles", "update", id, patch as Record<string, unknown>);
}

/* ------------------------------------------------------------------ */
/* Payment methods                                                     */
/* ------------------------------------------------------------------ */

export async function savePaymentMethod(input: {
  id?: string;
  userId: string;
  provider: string;
  label?: string | null;
  accountIdentifier?: string | null;
  qrPath?: string | null;
  isPreferred?: boolean;
}): Promise<string> {
  if (input.id) {
    const patch = {
      provider: input.provider,
      label: input.label ?? null,
      account_identifier: input.accountIdentifier ?? null,
      ...(input.qrPath !== undefined ? { qr_path: input.qrPath } : {}),
    };
    await db.payment_methods.update(input.id, { ...patch, updated_at: nowIso() });
    await enqueue("payment_methods", "update", input.id, patch);
    return input.id;
  }
  const row: PaymentMethod = {
    id: newId(),
    user_id: input.userId,
    provider: input.provider,
    label: input.label ?? null,
    account_identifier: input.accountIdentifier ?? null,
    qr_path: input.qrPath ?? null,
    is_preferred: input.isPreferred ?? false,
    is_active: true,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await db.payment_methods.put(row);
  await enqueue("payment_methods", "insert", row.id, row as unknown as Record<string, unknown>);
  return row.id;
}

export async function setPreferredPaymentMethod(userId: string, id: string): Promise<void> {
  const all = await db.payment_methods.where("user_id").equals(userId).toArray();
  for (const pm of all) {
    const next = pm.id === id;
    if (pm.is_preferred === next) continue;
    await db.payment_methods.update(pm.id, { is_preferred: next });
    await enqueue("payment_methods", "update", pm.id, { is_preferred: next });
  }
}

export async function deletePaymentMethod(id: string): Promise<void> {
  await db.payment_methods.delete(id);
  await enqueue("payment_methods", "delete", id, {});
}

/* ------------------------------------------------------------------ */
/* Circles                                                             */
/* ------------------------------------------------------------------ */

export async function createCircle(input: {
  ownerId: string;
  name: string;
  description?: string;
  emoji?: string;
  currency?: string;
}): Promise<string> {
  const circle: Circle = {
    id: newId(),
    name: input.name,
    description: input.description ?? null,
    emoji: input.emoji ?? "🧿",
    currency: input.currency ?? "NPR",
    owner_id: input.ownerId,
    archived: false,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await db.circles.put(circle);
  await enqueue("circles", "insert", circle.id, circle as unknown as Record<string, unknown>);
  await addCircleMember(circle.id, input.ownerId, "owner");
  await logActivity({
    actorId: input.ownerId,
    kind: "circle_created",
    summary: `created the circle ${circle.name}`,
    circleId: circle.id,
    entityType: "circle",
    entityId: circle.id,
  });
  return circle.id;
}

export async function updateCircle(id: string, patch: Partial<Circle>): Promise<void> {
  await db.circles.update(id, { ...patch, updated_at: nowIso() });
  await enqueue("circles", "update", id, patch as Record<string, unknown>);
}

export async function addCircleMember(
  circleId: string,
  userId: string,
  role: string = "member",
): Promise<void> {
  const existing = await db.circle_members
    .where("circle_id")
    .equals(circleId)
    .filter((m) => m.user_id === userId)
    .first();
  if (existing) return;
  const row: CircleMember = {
    id: newId(),
    circle_id: circleId,
    user_id: userId,
    role,
    created_at: nowIso(),
  };
  await db.circle_members.put(row);
  await enqueue("circle_members", "insert", row.id, row as unknown as Record<string, unknown>);
}

export async function removeCircleMember(id: string): Promise<void> {
  await db.circle_members.delete(id);
  await enqueue("circle_members", "delete", id, {});
}

/* ------------------------------------------------------------------ */
/* Friends                                                             */
/* ------------------------------------------------------------------ */

export async function addFriend(userId: string, friendId: string): Promise<void> {
  if (userId === friendId) throw new Error("You cannot add yourself.");
  const existing = await db.friends
    .where("user_id")
    .equals(userId)
    .filter((f) => f.friend_id === friendId)
    .first();
  if (existing) throw new Error("They are already in your friends list.");
  const row: Friend = {
    id: newId(),
    user_id: userId,
    friend_id: friendId,
    created_at: nowIso(),
  };
  await db.friends.put(row);
  await enqueue("friends", "insert", row.id, row as unknown as Record<string, unknown>);
}

export async function removeFriend(id: string): Promise<void> {
  await db.friends.delete(id);
  await enqueue("friends", "delete", id, {});
}

/* ------------------------------------------------------------------ */
/* Expenses                                                            */
/* ------------------------------------------------------------------ */

export interface ShareInput {
  userId: string;
  shareMinor: number;
}

export async function createExpense(input: {
  circleId: string;
  createdBy: string;
  title: string;
  amountMinor: number;
  currency: string;
  category: string;
  spentOn: string;
  paidBy: string;
  splitMethod: SplitMethod;
  notes?: string;
  shares: ShareInput[];
}): Promise<string> {
  const total = input.shares.reduce((sum, s) => sum + s.shareMinor, 0);
  if (total !== input.amountMinor) {
    throw new Error("The split doesn't add up to the expense total.");
  }
  const expense: Expense = {
    id: newId(),
    circle_id: input.circleId,
    title: input.title,
    amount_minor: input.amountMinor,
    currency: input.currency,
    category: input.category,
    spent_on: input.spentOn,
    paid_by: input.paidBy,
    split_method: input.splitMethod,
    notes: input.notes ?? null,
    receipt_path: null,
    created_by: input.createdBy,
    deleted_at: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await db.expenses.put(expense);
  await enqueue("expenses", "insert", expense.id, expense as unknown as Record<string, unknown>);

  for (const share of input.shares) {
    const row: ExpenseParticipant = {
      id: newId(),
      expense_id: expense.id,
      user_id: share.userId,
      share_minor: share.shareMinor,
      created_at: nowIso(),
    };
    await db.expense_participants.put(row);
    await enqueue(
      "expense_participants",
      "insert",
      row.id,
      row as unknown as Record<string, unknown>,
    );
  }

  await logActivity({
    actorId: input.createdBy,
    kind: "expense_added",
    summary: `added ${input.title}`,
    circleId: input.circleId,
    amountMinor: input.amountMinor,
    currency: input.currency,
    entityType: "expense",
    entityId: expense.id,
  });

  for (const share of input.shares) {
    if (share.userId === input.paidBy) continue;
    await notify({
      userId: share.userId,
      actorId: input.createdBy,
      kind: "new_expense",
      title: `New expense: ${input.title}`,
      body: `Your share is being tracked in this circle.`,
      entityType: "expense",
      entityId: expense.id,
    });
  }
  return expense.id;
}

/* ------------------------------------------------------------------ */
/* Loans                                                               */
/* ------------------------------------------------------------------ */

export async function createLoan(input: {
  createdBy: string;
  lenderId: string;
  borrowerId: string;
  amountMinor: number;
  currency: string;
  purpose?: string;
  lentOn?: string;
  dueOn?: string | null;
}): Promise<string> {
  const loan: Loan = {
    id: newId(),
    lender_id: input.lenderId,
    borrower_id: input.borrowerId,
    amount_minor: input.amountMinor,
    currency: input.currency,
    purpose: input.purpose ?? null,
    lent_on: input.lentOn ?? today(),
    due_on: input.dueOn ?? null,
    status: "active",
    created_by: input.createdBy,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await db.loans.put(loan);
  await enqueue("loans", "insert", loan.id, loan as unknown as Record<string, unknown>);

  const isLender = input.createdBy === input.lenderId;
  const counterparty = isLender ? input.borrowerId : input.lenderId;
  await logActivity({
    actorId: input.createdBy,
    kind: isLender ? "loan_lent" : "loan_borrowed",
    summary: isLender ? "recorded money lent" : "recorded money borrowed",
    counterpartyId: counterparty,
    amountMinor: input.amountMinor,
    currency: input.currency,
    entityType: "loan",
    entityId: loan.id,
  });
  await notify({
    userId: counterparty,
    actorId: input.createdBy,
    kind: isLender ? "you_owe" : "owed_to_you",
    title: isLender ? "A loan was recorded against you" : "Someone recorded borrowing from you",
    body: "Open the loan to review the details.",
    entityType: "loan",
    entityId: loan.id,
  });
  return loan.id;
}

export async function addRepayment(input: {
  loanId: string;
  amountMinor: number;
  recordedBy: string;
  note?: string;
  paidOn?: string;
}): Promise<void> {
  const row: LoanRepayment = {
    id: newId(),
    loan_id: input.loanId,
    amount_minor: input.amountMinor,
    paid_on: input.paidOn ?? today(),
    note: input.note ?? null,
    recorded_by: input.recordedBy,
    created_at: nowIso(),
  };
  await db.loan_repayments.put(row);
  await enqueue("loan_repayments", "insert", row.id, row as unknown as Record<string, unknown>);
}

/* ------------------------------------------------------------------ */
/* Settlements — borrower marks paid, lender confirms                  */
/* ------------------------------------------------------------------ */

export async function createSettlement(input: {
  payerId: string;
  payeeId: string;
  amountMinor: number;
  currency: string;
  circleId?: string | null;
  loanId?: string | null;
  methodProvider?: string | null;
  reference?: string | null;
  note?: string | null;
  proofPath?: string | null;
  paidOn?: string;
}): Promise<string> {
  const row: Settlement = {
    id: newId(),
    payer_id: input.payerId,
    payee_id: input.payeeId,
    circle_id: input.circleId ?? null,
    loan_id: input.loanId ?? null,
    amount_minor: input.amountMinor,
    currency: input.currency,
    state: "payment_pending",
    method_provider: input.methodProvider ?? null,
    reference: input.reference ?? null,
    note: input.note ?? null,
    proof_path: input.proofPath ?? null,
    paid_on: input.paidOn ?? today(),
    marked_paid_at: nowIso(),
    confirmed_at: null,
    rejected_at: null,
    rejection_reason: null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  await db.settlements.put(row);
  await enqueue("settlements", "insert", row.id, row as unknown as Record<string, unknown>);

  await logActivity({
    actorId: input.payerId,
    kind: "payment_marked",
    summary: "marked a payment as sent",
    counterpartyId: input.payeeId,
    circleId: input.circleId ?? null,
    amountMinor: input.amountMinor,
    currency: input.currency,
    entityType: "settlement",
    entityId: row.id,
  });
  await notify({
    userId: input.payeeId,
    actorId: input.payerId,
    kind: "payment_marked",
    title: "A payment is waiting for your confirmation",
    body: "Review the details and confirm or reject it.",
    entityType: "settlement",
    entityId: row.id,
  });
  return row.id;
}

export async function confirmSettlement(settlement: Settlement, byUserId: string): Promise<void> {
  if (byUserId !== settlement.payee_id) {
    throw new Error("Only the person receiving the money can confirm it.");
  }
  const confirmed_at = nowIso();
  await db.settlements.update(settlement.id, { state: "settled", confirmed_at });
  await enqueue("settlements", "update", settlement.id, { state: "settled", confirmed_at });

  if (settlement.loan_id) {
    await addRepayment({
      loanId: settlement.loan_id,
      amountMinor: settlement.amount_minor,
      recordedBy: byUserId,
      note: "Confirmed settlement",
      paidOn: settlement.paid_on,
    });
  }

  await logActivity({
    actorId: byUserId,
    kind: "payment_confirmed",
    summary: "confirmed a settlement",
    counterpartyId: settlement.payer_id,
    circleId: settlement.circle_id,
    amountMinor: settlement.amount_minor,
    currency: settlement.currency,
    entityType: "settlement",
    entityId: settlement.id,
  });
  await notify({
    userId: settlement.payer_id,
    actorId: byUserId,
    kind: "payment_confirmed",
    title: "Your payment was confirmed",
    body: "Settlement completed.",
    entityType: "settlement",
    entityId: settlement.id,
  });
}

export async function rejectSettlement(
  settlement: Settlement,
  byUserId: string,
  reason: string,
): Promise<void> {
  if (byUserId !== settlement.payee_id) {
    throw new Error("Only the person receiving the money can reject it.");
  }
  const rejected_at = nowIso();
  await db.settlements.update(settlement.id, {
    state: "rejected",
    rejected_at,
    rejection_reason: reason,
  });
  await enqueue("settlements", "update", settlement.id, {
    state: "rejected",
    rejected_at,
    rejection_reason: reason,
  });
  await logActivity({
    actorId: byUserId,
    kind: "payment_rejected",
    summary: "did not confirm a payment",
    counterpartyId: settlement.payer_id,
    circleId: settlement.circle_id,
    amountMinor: settlement.amount_minor,
    currency: settlement.currency,
    entityType: "settlement",
    entityId: settlement.id,
  });
  await notify({
    userId: settlement.payer_id,
    actorId: byUserId,
    kind: "payment_rejected",
    title: "Your payment was not confirmed",
    body: reason || "The recipient could not find this payment.",
    entityType: "settlement",
    entityId: settlement.id,
  });
}
