
REVOKE EXECUTE ON FUNCTION public.is_circle_member(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_circle_owner(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_see_expense(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.owns_expense(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_loan_party(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_settlement_state() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, public, authenticated;
GRANT EXECUTE ON FUNCTION public.is_circle_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_circle_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_see_expense(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_expense(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_loan_party(uuid, uuid) TO authenticated;
