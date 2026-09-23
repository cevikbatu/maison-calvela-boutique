-- Atomic one-time owner grant. This function is not available through the Data API.
CREATE OR REPLACE FUNCTION app_private.activate_first_owner(_user_id uuid, _email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _verified_email text;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(624191, 1107);
  SELECT email INTO _verified_email FROM auth.users
    WHERE id = _user_id AND email_confirmed_at IS NOT NULL AND is_anonymous IS NOT TRUE;
  IF _verified_email IS DISTINCT FROM 'cevikbatu11@gmail.com'
     OR _email IS DISTINCT FROM 'cevikbatu11@gmail.com'
     OR EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::public.app_role) THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, 'admin'::public.app_role);
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION app_private.activate_first_owner(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.activate_first_owner(uuid, text) TO service_role;