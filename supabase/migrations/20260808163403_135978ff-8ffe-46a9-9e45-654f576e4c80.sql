-- Normalise existing usernames to lowercase, de-duplicating if needed
UPDATE public.profiles p
SET username = lower(p.username)
WHERE p.username IS NOT NULL
  AND p.username <> lower(p.username)
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles q
    WHERE q.id <> p.id AND lower(q.username) = lower(p.username)
  );

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_key
  ON public.profiles (lower(username));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  desired text;
  candidate text;
BEGIN
  desired := lower(nullif(trim(NEW.raw_user_meta_data->>'username'), ''));
  IF desired IS NULL THEN
    desired := lower(split_part(COALESCE(NEW.email, NEW.id::text), '@', 1));
  END IF;
  desired := regexp_replace(desired, '[^a-z0-9_]', '', 'g');
  IF length(desired) < 3 THEN
    desired := 'user' || substr(NEW.id::text, 1, 6);
  END IF;

  candidate := desired;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = candidate) THEN
    candidate := desired || '_' || substr(NEW.id::text, 1, 4);
  END IF;

  INSERT INTO public.profiles (id, name, email, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    candidate
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;