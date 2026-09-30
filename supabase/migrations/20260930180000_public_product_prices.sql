-- Retail prices are intentionally public storefront data; mutations remain admin-only.
GRANT SELECT ON public.product_prices TO anon, authenticated;
DROP POLICY IF EXISTS prices_public_read ON public.product_prices;
CREATE POLICY prices_public_read ON public.product_prices
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.products p
  WHERE p.id = product_id AND p.published
));
