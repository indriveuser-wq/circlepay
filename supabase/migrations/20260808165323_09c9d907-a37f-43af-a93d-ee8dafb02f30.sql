CREATE OR REPLACE FUNCTION public.find_profile_by_username(_username text)
RETURNS TABLE (id uuid, name text, username text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.name, p.username, p.avatar_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND lower(p.username) = lower(trim(_username))
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.find_profile_by_username(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_profile_by_username(text) TO authenticated;