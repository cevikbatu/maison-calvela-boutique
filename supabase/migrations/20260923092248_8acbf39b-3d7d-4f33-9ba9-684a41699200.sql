CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA app_private TO authenticated;
CREATE OR REPLACE FUNCTION app_private.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role) $$;
REVOKE ALL ON FUNCTION app_private.has_role(uuid,public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.has_role(uuid,public.app_role) TO authenticated;
DO $$ DECLARE p record; BEGIN FOR p IN SELECT schemaname,tablename,policyname,qual,with_check FROM pg_policies WHERE schemaname='public' AND (qual LIKE '%has_role%' OR with_check LIKE '%has_role%') LOOP EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)%s',p.policyname,p.schemaname,p.tablename,coalesce(replace(replace(p.qual,'public.has_role','app_private.has_role'),'has_role(', 'app_private.has_role('),'true'),CASE WHEN p.with_check IS NOT NULL THEN format(' WITH CHECK (%s)',replace(replace(p.with_check,'public.has_role','app_private.has_role'),'has_role(', 'app_private.has_role(')) ELSE '' END); END LOOP; END $$;
DROP FUNCTION public.has_role(uuid,public.app_role);