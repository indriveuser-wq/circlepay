REVOKE EXECUTE ON FUNCTION public.shares_context(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_circle_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_circle_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_loan_party(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.owns_expense(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_see_expense(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.shares_context(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_circle_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_circle_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_loan_party(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_expense(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_see_expense(uuid, uuid) TO authenticated;