-- Draft only: do not apply to the live project without explicit approval.
ALTER TABLE public.addresses ADD CONSTRAINT addresses_user_id_id_key UNIQUE(user_id,id);
CREATE TABLE public.default_addresses (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 address_id uuid NOT NULL,
 CONSTRAINT default_address_owned FOREIGN KEY(user_id,address_id)
  REFERENCES public.addresses(user_id,id) ON DELETE CASCADE
);
ALTER TABLE public.default_addresses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.default_addresses FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.default_addresses TO authenticated;
GRANT ALL ON public.default_addresses TO service_role;
CREATE POLICY default_address_owner ON public.default_addresses FOR ALL TO authenticated
 USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()));
