-- Allow only the verified fixed owner account to claim the first admin role.
-- This removes the service-role dependency from the one-time activation step
-- without opening role assignment to arbitrary authenticated users.
CREATE OR REPLACE FUNCTION app_private.owner_setup_available()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'::public.app_role
  );
$$;
REVOKE ALL ON FUNCTION app_private.owner_setup_available() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_private.owner_setup_available() TO anon, authenticated;

CREATE OR REPLACE FUNCTION app_private.claim_first_owner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  verified_email text;
BEGIN
  IF actor IS NULL THEN
    RETURN false;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(624191, 1107);

  SELECT email INTO verified_email
  FROM auth.users
  WHERE id = actor
    AND email_confirmed_at IS NOT NULL
    AND is_anonymous IS NOT TRUE;

  IF verified_email IS DISTINCT FROM 'cevikbatu11@gmail.com' THEN
    RETURN false;
  END IF;

  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=actor AND role='admin'::public.app_role) THEN RETURN true; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role='admin'::public.app_role) THEN RETURN false; END IF;

  INSERT INTO public.user_roles(user_id, role)
  VALUES (actor, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = actor AND role = 'admin'::public.app_role
  );
END;
$$;
REVOKE ALL ON FUNCTION app_private.claim_first_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.claim_first_owner() TO authenticated;

-- API wrappers run with caller privileges; privileged implementations stay private.
GRANT USAGE ON SCHEMA app_private TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.owner_setup_available()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT app_private.owner_setup_available();
$$;
REVOKE ALL ON FUNCTION public.owner_setup_available() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.owner_setup_available() TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.claim_first_owner()
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT app_private.claim_first_owner();
$$;
REVOKE ALL ON FUNCTION public.claim_first_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_first_owner() TO authenticated;