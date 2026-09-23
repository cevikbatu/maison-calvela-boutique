-- Expose the one-time operation solely to the trusted service role; all checks remain inside the private function.
CREATE OR REPLACE FUNCTION public.activate_first_owner(_user_id uuid, _email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$ SELECT app_private.activate_first_owner(_user_id, _email) $$;
REVOKE ALL ON FUNCTION public.activate_first_owner(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_first_owner(uuid, text) TO service_role;