
-- Rate limit checker
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _action text,
  _max_count int,
  _window_seconds int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _count int;
BEGIN
  IF _uid IS NULL THEN
    RETURN; -- anon callers handled elsewhere (e.g. by IP at edge)
  END IF;

  SELECT COUNT(*) INTO _count
  FROM public.rate_limit_events
  WHERE user_id = _uid
    AND action = _action
    AND created_at > now() - make_interval(secs => _window_seconds);

  IF _count >= _max_count THEN
    RAISE EXCEPTION 'rate_limit_exceeded: too many % requests, try again later', _action
      USING ERRCODE = '42901';
  END IF;

  INSERT INTO public.rate_limit_events (user_id, action) VALUES (_uid, _action);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) TO authenticated;

-- deposit_requests INSERT policy for users
CREATE POLICY "user creates own deposit"
ON public.deposit_requests
FOR INSERT
TO authenticated
WITH CHECK (
  wallet_user_id = auth.uid()
  AND status = 'pending'
  AND confirmed_by IS NULL
  AND confirmed_at IS NULL
);
