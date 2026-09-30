-- Retail prices are intentionally public storefront data; mutations remain admin-only.
-- Explicit column privileges survive future private-column additions without exposing them.
REVOKE SELECT ON public.product_prices FROM PUBLIC, anon, authenticated;
GRANT SELECT (product_id, price, sale_price, updated_at) ON public.product_prices TO anon, authenticated;
DROP POLICY IF EXISTS prices_public_read ON public.product_prices;
CREATE POLICY prices_public_read ON public.product_prices
FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.products p
  WHERE p.id = product_id AND p.published
));
