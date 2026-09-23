REVOKE ALL PRIVILEGES ON TABLE public.addresses FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.customer_preferences FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_preferences TO authenticated;
GRANT ALL ON public.addresses, public.customer_preferences TO service_role;