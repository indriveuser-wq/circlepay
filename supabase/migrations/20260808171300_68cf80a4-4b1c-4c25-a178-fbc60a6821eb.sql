UPDATE public.settlements s
SET circle_id = (
  SELECT a.circle_id
  FROM public.circle_members a
  JOIN public.circle_members b ON b.circle_id = a.circle_id
  WHERE a.user_id = s.payer_id AND b.user_id = s.payee_id
  LIMIT 1
)
WHERE s.circle_id IS NULL
  AND s.loan_id IS NULL
  AND (
    SELECT count(DISTINCT a.circle_id)
    FROM public.circle_members a
    JOIN public.circle_members b ON b.circle_id = a.circle_id
    WHERE a.user_id = s.payer_id AND b.user_id = s.payee_id
  ) = 1;