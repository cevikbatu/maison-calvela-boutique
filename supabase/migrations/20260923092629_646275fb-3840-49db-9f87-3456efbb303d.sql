CREATE TABLE public.product_prices (product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE, price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price>=0), sale_price numeric(12,2) CHECK (sale_price IS NULL OR sale_price>=0), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.product_prices TO authenticated; GRANT ALL ON public.product_prices TO service_role;
ALTER TABLE public.product_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY prices_admin ON public.product_prices FOR ALL TO authenticated USING (app_private.has_role(auth.uid(),'admin')) WITH CHECK (app_private.has_role(auth.uid(),'admin'));
CREATE TRIGGER prices_updated BEFORE UPDATE ON public.product_prices FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
INSERT INTO public.product_prices(product_id,price,sale_price) SELECT id,price,sale_price FROM public.products;
ALTER TABLE public.products DROP COLUMN price, DROP COLUMN sale_price;