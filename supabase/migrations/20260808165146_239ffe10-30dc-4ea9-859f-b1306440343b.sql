-- Helper: do two users share a circle, loan, or settlement?
CREATE OR REPLACE FUNCTION public.shares_context(_other uuid, _me uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _other = _me
    OR EXISTS (
      SELECT 1 FROM public.circle_members a
      JOIN public.circle_members b ON a.circle_id = b.circle_id
      WHERE a.user_id = _me AND b.user_id = _other
    )
    OR EXISTS (
      SELECT 1 FROM public.loans l
      WHERE (l.lender_id = _me AND l.borrower_id = _other)
         OR (l.borrower_id = _me AND l.lender_id = _other)
    )
    OR EXISTS (
      SELECT 1 FROM public.settlements s
      WHERE (s.payer_id = _me AND s.payee_id = _other)
         OR (s.payee_id = _me AND s.payer_id = _other)
    );
$$;

GRANT EXECUTE ON FUNCTION public.shares_context(uuid, uuid) TO authenticated;

-- profiles: restrict reads to self + related users
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_related ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR public.shares_context(id, auth.uid()));

-- notifications: only notify users you actually share context with
DROP POLICY IF EXISTS notif_insert_authenticated ON public.notifications;
CREATE POLICY notif_insert_related ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND (user_id = auth.uid() OR public.shares_context(user_id, auth.uid()))
);

-- Trigger-only SECURITY DEFINER functions must not be directly callable
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_settlement_state() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;