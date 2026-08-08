CREATE TABLE public.friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friends_not_self CHECK (user_id <> friend_id),
  CONSTRAINT friends_unique UNIQUE (user_id, friend_id)
);

GRANT SELECT, INSERT, DELETE ON public.friends TO authenticated;
GRANT ALL ON public.friends TO service_role;

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY friends_select_related ON public.friends FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY friends_insert_own ON public.friends FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY friends_delete_own ON public.friends FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX friends_friend_id_idx ON public.friends (friend_id);

CREATE OR REPLACE FUNCTION public.shares_context(_other uuid, _me uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN auth.uid() IS NOT NULL AND _me <> auth.uid() THEN false ELSE (
    _other = _me
    OR EXISTS (SELECT 1 FROM public.friends f WHERE (f.user_id = _me AND f.friend_id = _other) OR (f.user_id = _other AND f.friend_id = _me))
    OR EXISTS (SELECT 1 FROM public.circle_members a JOIN public.circle_members b ON a.circle_id = b.circle_id WHERE a.user_id = _me AND b.user_id = _other)
    OR EXISTS (SELECT 1 FROM public.loans l WHERE (l.lender_id = _me AND l.borrower_id = _other) OR (l.borrower_id = _me AND l.lender_id = _other))
    OR EXISTS (SELECT 1 FROM public.settlements s WHERE (s.payer_id = _me AND s.payee_id = _other) OR (s.payee_id = _me AND s.payer_id = _other))
  ) END;
$function$;

REVOKE ALL ON FUNCTION public.shares_context(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shares_context(uuid, uuid) TO authenticated;