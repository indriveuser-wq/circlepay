-- 1. Expense participant share integrity
CREATE OR REPLACE FUNCTION public.guard_expense_share()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total bigint;
  used bigint;
BEGIN
  IF NEW.share_minor < 0 THEN
    RAISE EXCEPTION 'Share cannot be negative';
  END IF;

  SELECT e.amount_minor INTO total FROM public.expenses e WHERE e.id = NEW.expense_id;
  IF total IS NULL THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  SELECT COALESCE(SUM(p.share_minor), 0) INTO used
  FROM public.expense_participants p
  WHERE p.expense_id = NEW.expense_id
    AND (TG_OP = 'INSERT' OR p.id <> NEW.id);

  IF used + NEW.share_minor > total THEN
    RAISE EXCEPTION 'Participant shares exceed the expense total';
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_expense_share_guard ON public.expense_participants;
CREATE TRIGGER trg_expense_share_guard
BEFORE INSERT OR UPDATE ON public.expense_participants
FOR EACH ROW EXECUTE FUNCTION public.guard_expense_share();

-- 2. Loan immutability + status transition control
CREATE OR REPLACE FUNCTION public.guard_loan_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.amount_minor <> OLD.amount_minor
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.lender_id <> OLD.lender_id
     OR NEW.borrower_id <> OLD.borrower_id
     OR NEW.created_by <> OLD.created_by
     OR NEW.lent_on <> OLD.lent_on THEN
    RAISE EXCEPTION 'Loan terms cannot be changed after creation';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF auth.uid() <> OLD.lender_id THEN
      RAISE EXCEPTION 'Only the lender can change the loan status';
    END IF;
    IF OLD.status <> 'active' THEN
      RAISE EXCEPTION 'Loan is already resolved';
    END IF;
    IF NEW.status NOT IN ('paid', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid loan status transition';
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_loans_guard ON public.loans;
CREATE TRIGGER trg_loans_guard
BEFORE UPDATE ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.guard_loan_update();

-- 3. Settlement immutability + timestamps
CREATE OR REPLACE FUNCTION public.guard_settlement_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payer_id <> OLD.payer_id
     OR NEW.payee_id <> OLD.payee_id
     OR NEW.amount_minor <> OLD.amount_minor
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.circle_id IS DISTINCT FROM OLD.circle_id
     OR NEW.loan_id IS DISTINCT FROM OLD.loan_id
     OR NEW.proof_path IS DISTINCT FROM OLD.proof_path
     OR NEW.paid_on IS DISTINCT FROM OLD.paid_on
     OR NEW.method_provider IS DISTINCT FROM OLD.method_provider
     OR NEW.reference IS DISTINCT FROM OLD.reference
     OR NEW.marked_paid_at IS DISTINCT FROM OLD.marked_paid_at THEN
    RAISE EXCEPTION 'Settlement details cannot be modified';
  END IF;

  IF NEW.state <> OLD.state THEN
    IF auth.uid() <> OLD.payee_id THEN
      RAISE EXCEPTION 'Only the recipient can change a settlement state';
    END IF;
    IF OLD.state <> 'payment_pending' THEN
      RAISE EXCEPTION 'Settlement is already resolved';
    END IF;
    IF NEW.state NOT IN ('settled', 'rejected') THEN
      RAISE EXCEPTION 'Invalid settlement state transition';
    END IF;
    IF NEW.state = 'settled' THEN
      NEW.confirmed_at := now();
      NEW.rejected_at := NULL;
      NEW.rejection_reason := NULL;
    ELSE
      NEW.rejected_at := now();
      NEW.confirmed_at := NULL;
    END IF;
  ELSE
    NEW.confirmed_at := OLD.confirmed_at;
    NEW.rejected_at := OLD.rejected_at;
    NEW.rejection_reason := OLD.rejection_reason;
  END IF;

  RETURN NEW;
END; $$;

-- 4. Lock down SECURITY DEFINER function execution
REVOKE ALL ON FUNCTION public.guard_expense_share() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_loan_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_settlement_state() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.can_see_expense(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_circle_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_circle_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_loan_party(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.owns_expense(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.shares_context(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_profile_by_username(text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.can_see_expense(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_circle_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_circle_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_loan_party(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_expense(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_context(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_profile_by_username(text) TO authenticated;