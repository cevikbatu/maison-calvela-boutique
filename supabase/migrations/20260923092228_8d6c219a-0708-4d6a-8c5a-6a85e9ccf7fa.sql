REVOKE ALL ON FUNCTION public.create_signup_profile() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated;