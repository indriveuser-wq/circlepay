
-- ============ profiles ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  email TEXT,
  phone TEXT,
  currency TEXT NOT NULL DEFAULT 'NPR',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kathmandu',
  notify_in_app BOOLEAN NOT NULL DEFAULT true,
  notify_push BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    lower(split_part(COALESCE(NEW.email, NEW.id::text), '@', 1)) || '_' || substr(NEW.id::text, 1, 4)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ payment methods ============
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  label TEXT,
  account_identifier TEXT,
  qr_path TEXT,
  is_preferred BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_select_authenticated" ON public.payment_methods FOR SELECT TO authenticated USING (is_active OR user_id = auth.uid());
CREATE POLICY "pm_manage_own" ON public.payment_methods FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_pm_updated BEFORE UPDATE ON public.payment_methods
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ circles ============
CREATE TABLE public.circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT NOT NULL DEFAULT '🧿',
  currency TEXT NOT NULL DEFAULT 'NPR',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

CREATE OR REPLACE FUNCTION public.is_circle_member(_circle UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.circle_members WHERE circle_id = _circle AND user_id = _user);
$$;

CREATE OR REPLACE FUNCTION public.is_circle_owner(_circle UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.circles WHERE id = _circle AND owner_id = _user);
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.circles TO authenticated;
GRANT ALL ON public.circles TO service_role;
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "circles_select_members" ON public.circles FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_circle_member(id, auth.uid()));
CREATE POLICY "circles_insert_own" ON public.circles FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "circles_update_owner" ON public.circles FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "circles_delete_owner" ON public.circles FOR DELETE TO authenticated USING (owner_id = auth.uid());
CREATE TRIGGER trg_circles_updated BEFORE UPDATE ON public.circles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.circle_members TO authenticated;
GRANT ALL ON public.circle_members TO service_role;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm_select_members" ON public.circle_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_circle_member(circle_id, auth.uid()));
CREATE POLICY "cm_insert_owner" ON public.circle_members FOR INSERT TO authenticated
  WITH CHECK (public.is_circle_owner(circle_id, auth.uid()));
CREATE POLICY "cm_delete_owner_or_self" ON public.circle_members FOR DELETE TO authenticated
  USING (public.is_circle_owner(circle_id, auth.uid()) OR user_id = auth.uid());

-- ============ expenses ============
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'NPR',
  category TEXT NOT NULL DEFAULT 'other',
  spent_on DATE NOT NULL DEFAULT (now()::date),
  paid_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  split_method TEXT NOT NULL DEFAULT 'equal',
  notes TEXT,
  receipt_path TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exp_select_members" ON public.expenses FOR SELECT TO authenticated USING (public.is_circle_member(circle_id, auth.uid()));
CREATE POLICY "exp_insert_members" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (public.is_circle_member(circle_id, auth.uid()) AND created_by = auth.uid());
CREATE POLICY "exp_update_creator" ON public.expenses FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "exp_delete_creator" ON public.expenses FOR DELETE TO authenticated USING (created_by = auth.uid());
CREATE TRIGGER trg_exp_updated BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.expense_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_minor BIGINT NOT NULL CHECK (share_minor >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (expense_id, user_id)
);

CREATE OR REPLACE FUNCTION public.can_see_expense(_expense UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.expenses e
    JOIN public.circle_members m ON m.circle_id = e.circle_id
    WHERE e.id = _expense AND m.user_id = _user
  );
$$;

CREATE OR REPLACE FUNCTION public.owns_expense(_expense UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = _expense AND e.created_by = _user);
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_participants TO authenticated;
GRANT ALL ON public.expense_participants TO service_role;
ALTER TABLE public.expense_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ep_select_members" ON public.expense_participants FOR SELECT TO authenticated USING (public.can_see_expense(expense_id, auth.uid()));
CREATE POLICY "ep_write_creator" ON public.expense_participants FOR INSERT TO authenticated WITH CHECK (public.owns_expense(expense_id, auth.uid()));
CREATE POLICY "ep_update_creator" ON public.expense_participants FOR UPDATE TO authenticated USING (public.owns_expense(expense_id, auth.uid())) WITH CHECK (public.owns_expense(expense_id, auth.uid()));
CREATE POLICY "ep_delete_creator" ON public.expense_participants FOR DELETE TO authenticated USING (public.owns_expense(expense_id, auth.uid()));

-- ============ loans ============
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'NPR',
  purpose TEXT,
  lent_on DATE NOT NULL DEFAULT (now()::date),
  due_on DATE,
  status TEXT NOT NULL DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (lender_id <> borrower_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loans_select_parties" ON public.loans FOR SELECT TO authenticated USING (lender_id = auth.uid() OR borrower_id = auth.uid());
CREATE POLICY "loans_insert_party" ON public.loans FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (lender_id = auth.uid() OR borrower_id = auth.uid()));
CREATE POLICY "loans_update_parties" ON public.loans FOR UPDATE TO authenticated
  USING (lender_id = auth.uid() OR borrower_id = auth.uid())
  WITH CHECK (lender_id = auth.uid() OR borrower_id = auth.uid());
CREATE TRIGGER trg_loans_updated BEFORE UPDATE ON public.loans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.is_loan_party(_loan UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.loans l WHERE l.id = _loan AND (l.lender_id = _user OR l.borrower_id = _user));
$$;

CREATE TABLE public.loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  paid_on DATE NOT NULL DEFAULT (now()::date),
  note TEXT,
  recorded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.loan_repayments TO authenticated;
GRANT ALL ON public.loan_repayments TO service_role;
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lr_select_parties" ON public.loan_repayments FOR SELECT TO authenticated USING (public.is_loan_party(loan_id, auth.uid()));
CREATE POLICY "lr_insert_parties" ON public.loan_repayments FOR INSERT TO authenticated
  WITH CHECK (public.is_loan_party(loan_id, auth.uid()) AND recorded_by = auth.uid());

-- ============ settlements ============
CREATE TABLE public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  circle_id UUID REFERENCES public.circles(id) ON DELETE SET NULL,
  loan_id UUID REFERENCES public.loans(id) ON DELETE SET NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'NPR',
  state TEXT NOT NULL DEFAULT 'payment_pending',
  method_provider TEXT,
  reference TEXT,
  note TEXT,
  proof_path TEXT,
  paid_on DATE NOT NULL DEFAULT (now()::date),
  marked_paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (payer_id <> payee_id)
);
GRANT SELECT, INSERT, UPDATE ON public.settlements TO authenticated;
GRANT ALL ON public.settlements TO service_role;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "st_select_parties" ON public.settlements FOR SELECT TO authenticated USING (payer_id = auth.uid() OR payee_id = auth.uid());
CREATE POLICY "st_insert_payer" ON public.settlements FOR INSERT TO authenticated
  WITH CHECK (payer_id = auth.uid() AND state = 'payment_pending');
CREATE POLICY "st_update_payee" ON public.settlements FOR UPDATE TO authenticated
  USING (payee_id = auth.uid()) WITH CHECK (payee_id = auth.uid());
CREATE TRIGGER trg_st_updated BEFORE UPDATE ON public.settlements
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Guard the state machine: only the payee may move a pending settlement to settled/rejected.
CREATE OR REPLACE FUNCTION public.guard_settlement_state() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
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
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_settlement_state BEFORE UPDATE ON public.settlements
FOR EACH ROW EXECUTE FUNCTION public.guard_settlement_state();

-- ============ notifications ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  entity_type TEXT,
  entity_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notif_insert_authenticated" ON public.notifications FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() OR user_id = auth.uid());
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ activity ============
CREATE TABLE public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  circle_id UUID REFERENCES public.circles(id) ON DELETE CASCADE,
  counterparty_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  amount_minor BIGINT,
  currency TEXT,
  entity_type TEXT,
  entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_events TO authenticated;
GRANT ALL ON public.activity_events TO service_role;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "act_select_related" ON public.activity_events FOR SELECT TO authenticated
  USING (
    actor_id = auth.uid()
    OR counterparty_id = auth.uid()
    OR (circle_id IS NOT NULL AND public.is_circle_member(circle_id, auth.uid()))
  );
CREATE POLICY "act_insert_actor" ON public.activity_events FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

CREATE INDEX idx_cm_user ON public.circle_members(user_id);
CREATE INDEX idx_exp_circle ON public.expenses(circle_id);
CREATE INDEX idx_ep_expense ON public.expense_participants(expense_id);
CREATE INDEX idx_loans_parties ON public.loans(lender_id, borrower_id);
CREATE INDEX idx_settle_parties ON public.settlements(payer_id, payee_id);
CREATE INDEX idx_notif_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_act_created ON public.activity_events(created_at DESC);
