CREATE OR REPLACE FUNCTION public.guard_loan_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  NEW.status := 'pending_confirmation';
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_loans_insert_guard ON public.loans;
CREATE TRIGGER trg_loans_insert_guard BEFORE INSERT ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.guard_loan_insert();

CREATE OR REPLACE FUNCTION public.guard_loan_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
    IF OLD.status = 'pending_confirmation' THEN
      IF NEW.status IN ('active', 'rejected') THEN
        IF auth.uid() = OLD.created_by THEN
          RAISE EXCEPTION 'Only the other person can confirm this loan';
        END IF;
      ELSIF NEW.status = 'cancelled' THEN
        IF auth.uid() <> OLD.created_by THEN
          RAISE EXCEPTION 'Only the creator can cancel a pending loan';
        END IF;
      ELSE
        RAISE EXCEPTION 'Invalid loan status transition';
      END IF;
    ELSIF OLD.status = 'active' THEN
      IF auth.uid() <> OLD.lender_id THEN
        RAISE EXCEPTION 'Only the lender can change the loan status';
      END IF;
      IF NEW.status NOT IN ('paid', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid loan status transition';
      END IF;
    ELSE
      RAISE EXCEPTION 'Loan is already resolved';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.guard_loan_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_loan_update() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS lr_insert_parties ON public.loan_repayments;
CREATE POLICY lr_insert_parties ON public.loan_repayments FOR INSERT TO authenticated
WITH CHECK (is_loan_party(loan_id, auth.uid()) AND recorded_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.loans l WHERE l.id = loan_id AND l.status = 'active'));