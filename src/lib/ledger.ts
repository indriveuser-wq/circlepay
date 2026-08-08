import type {
  Expense,
  ExpenseParticipant,
  Loan,
  LoanRepayment,
  Settlement,
} from "./db";

export interface LedgerInput {
  expenses: Expense[];
  participants: ExpenseParticipant[];
  loans: Loan[];
  repayments: LoanRepayment[];
  settlements: Settlement[];
}

export interface DebtEdge {
  debtor: string;
  creditor: string;
  amountMinor: number;
}

const key = (a: string, b: string) => `${a}|${b}`;

/**
 * Builds the pairwise debt graph from immutable financial records.
 * Nothing is mutated or deleted — every balance is derived.
 */
export function buildDebtGraph(input: LedgerInput, circleId?: string): Map<string, number> {
  const graph = new Map<string, number>();
  const add = (debtor: string, creditor: string, amount: number) => {
    if (amount === 0 || debtor === creditor) return;
    graph.set(key(debtor, creditor), (graph.get(key(debtor, creditor)) ?? 0) + amount);
  };

  const expenses = input.expenses.filter(
    (e) => !e.deleted_at && (circleId ? e.circle_id === circleId : true),
  );
  const expenseIds = new Set(expenses.map((e) => e.id));
  const byExpense = new Map<string, Expense>(expenses.map((e) => [e.id, e]));

  for (const p of input.participants) {
    if (!expenseIds.has(p.expense_id)) continue;
    const expense = byExpense.get(p.expense_id);
    if (!expense) continue;
    add(p.user_id, expense.paid_by, p.share_minor);
  }

  if (!circleId) {
    const paidByLoan = new Map<string, number>();
    for (const r of input.repayments) {
      paidByLoan.set(r.loan_id, (paidByLoan.get(r.loan_id) ?? 0) + r.amount_minor);
    }
    for (const loan of input.loans) {
      const outstanding = loan.amount_minor - (paidByLoan.get(loan.id) ?? 0);
      if (outstanding > 0) add(loan.borrower_id, loan.lender_id, outstanding);
    }
  }

  for (const s of input.settlements) {
    if (s.state !== "settled") continue;
    // Loan-linked settlements are already reflected as loan repayments.
    if (s.loan_id) continue;
    if (circleId && s.circle_id !== circleId) continue;
    add(s.payee_id, s.payer_id, s.amount_minor);
  }

  return graph;
}

/** Net amount `a` owes `b`. Negative means `b` owes `a`. */
export function netBetween(graph: Map<string, number>, a: string, b: string): number {
  return (graph.get(key(a, b)) ?? 0) - (graph.get(key(b, a)) ?? 0);
}

export function netBalanceFor(graph: Map<string, number>, userId: string): Map<string, number> {
  const others = new Set<string>();
  for (const k of graph.keys()) {
    const [debtor, creditor] = k.split("|") as [string, string];
    if (debtor === userId) others.add(creditor);
    if (creditor === userId) others.add(debtor);
  }
  const result = new Map<string, number>();
  for (const other of others) {
    // Positive => other owes me.
    const value = netBetween(graph, other, userId);
    if (value !== 0) result.set(other, value);
  }
  return result;
}

/**
 * Minimises the number of payments needed to clear a group.
 * Original expense records are untouched — this is a recommendation only.
 */
export function simplifyDebts(graph: Map<string, number>): DebtEdge[] {
  const net = new Map<string, number>();
  for (const [k, amount] of graph) {
    const [debtor, creditor] = k.split("|") as [string, string];
    net.set(debtor, (net.get(debtor) ?? 0) - amount);
    net.set(creditor, (net.get(creditor) ?? 0) + amount);
  }

  const debtors = [...net.entries()].filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v }));
  const creditors = [...net.entries()].filter(([, v]) => v > 0).map(([id, v]) => ({ id, v }));
  debtors.sort((a, b) => b.v - a.v);
  creditors.sort((a, b) => b.v - a.v);

  const edges: DebtEdge[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i]!;
    const c = creditors[j]!;
    const amount = Math.min(d.v, c.v);
    if (amount > 0) edges.push({ debtor: d.id, creditor: c.id, amountMinor: amount });
    d.v -= amount;
    c.v -= amount;
    if (d.v === 0) i += 1;
    if (c.v === 0) j += 1;
  }
  return edges;
}

/**
 * Aggregated net position of every member in the graph.
 * Positive => the group owes them; negative => they owe the group.
 * Individual expense rows are never modified — this is derived on read.
 */
export function memberNetBalances(graph: Map<string, number>): Map<string, number> {
  const net = new Map<string, number>();
  for (const [k, amount] of graph) {
    const [debtor, creditor] = k.split("|") as [string, string];
    net.set(debtor, (net.get(debtor) ?? 0) - amount);
    net.set(creditor, (net.get(creditor) ?? 0) + amount);
  }
  return net;
}

/**
 * Minimised settlement plan, then narrowed to the transactions the current
 * user must make or receive. Debts between two other members stay private.
 */
export function settlementPlanFor(graph: Map<string, number>, userId: string): DebtEdge[] {
  return simplifyDebts(graph).filter((e) => e.debtor === userId || e.creditor === userId);
}


export function loanOutstanding(loan: Loan, repayments: LoanRepayment[]): number {
  const paid = repayments
    .filter((r) => r.loan_id === loan.id)
    .reduce((sum, r) => sum + r.amount_minor, 0);
  return Math.max(0, loan.amount_minor - paid);
}

export function loanPaid(loan: Loan, repayments: LoanRepayment[]): number {
  return repayments
    .filter((r) => r.loan_id === loan.id)
    .reduce((sum, r) => sum + r.amount_minor, 0);
}

export function deriveLoanStatus(
  loan: Loan,
  repayments: LoanRepayment[],
  settlements: Settlement[],
): { status: LoanDisplayStatus; outstanding: number } {
  const outstanding = loanOutstanding(loan, repayments);
  if (outstanding <= 0) return { status: "settled", outstanding: 0 };
  const pending = settlements.some((s) => s.loan_id === loan.id && s.state === "payment_pending");
  if (pending) return { status: "payment_pending", outstanding };
  const paid = loanPaid(loan, repayments);
  if (loan.due_on && loan.due_on < new Date().toISOString().slice(0, 10)) {
    return { status: "overdue", outstanding };
  }
  if (paid > 0) return { status: "partial", outstanding };
  return { status: "active", outstanding };
}

export type LoanDisplayStatus =
  | "active"
  | "partial"
  | "payment_pending"
  | "settled"
  | "overdue";
