CREATE OR REPLACE FUNCTION public.shares_context(_other uuid, _me uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN auth.uid() IS NOT NULL AND _me <> auth.uid() THEN false ELSE (
    _other = _me
    OR EXISTS (SELECT 1 FROM public.circle_members a JOIN public.circle_members b ON a.circle_id = b.circle_id WHERE a.user_id = _me AND b.user_id = _other)
    OR EXISTS (SELECT 1 FROM public.loans l WHERE (l.lender_id = _me AND l.borrower_id = _other) OR (l.borrower_id = _me AND l.lender_id = _other))
    OR EXISTS (SELECT 1 FROM public.settlements s WHERE (s.payer_id = _me AND s.payee_id = _other) OR (s.payee_id = _me AND s.payer_id = _other))
  ) END;
$$;

CREATE OR REPLACE FUNCTION public.is_circle_member(_circle uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN auth.uid() IS NOT NULL AND _user <> auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.circle_members WHERE circle_id = _circle AND user_id = _user) END;
$$;

CREATE OR REPLACE FUNCTION public.is_circle_owner(_circle uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN auth.uid() IS NOT NULL AND _user <> auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.circles WHERE id = _circle AND owner_id = _user) END;
$$;

CREATE OR REPLACE FUNCTION public.is_loan_party(_loan uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN auth.uid() IS NOT NULL AND _user <> auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.loans l WHERE l.id = _loan AND (l.lender_id = _user OR l.borrower_id = _user)) END;
$$;

CREATE OR REPLACE FUNCTION public.owns_expense(_expense uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN auth.uid() IS NOT NULL AND _user <> auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.expenses e WHERE e.id = _expense AND e.created_by = _user) END;
$$;

CREATE OR REPLACE FUNCTION public.can_see_expense(_expense uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN auth.uid() IS NOT NULL AND _user <> auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.expenses e JOIN public.circle_members m ON m.circle_id = e.circle_id WHERE e.id = _expense AND m.user_id = _user) END;
$$;