REVOKE INSERT, UPDATE, DELETE ON public.orders FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM authenticated;
GRANT INSERT,UPDATE,DELETE ON public.orders TO authenticated;
GRANT INSERT,UPDATE,DELETE ON public.order_items TO authenticated;