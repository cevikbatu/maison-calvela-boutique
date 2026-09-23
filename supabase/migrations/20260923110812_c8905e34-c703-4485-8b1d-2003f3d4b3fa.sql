-- Least-privilege grants: RLS stays the primary gate, but remove blanket table privileges.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- Public catalog reads (RLS still restricts to published rows)
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.collections TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT SELECT ON public.product_collections TO anon, authenticated;

-- Catalog management (admin-only via RLS)
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_collections TO authenticated;

-- Internal prices: never anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_prices TO authenticated;

-- Customer-owned data
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;

-- Privacy-conscious analytics: write-only for the storefront, read for admins via RLS
GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT INSERT ON public.product_views TO anon, authenticated;
GRANT SELECT ON public.page_views TO authenticated;
GRANT SELECT ON public.product_views TO authenticated;

-- Service role keeps full access for server-side admin operations
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Trigger helper should not be callable by clients
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;