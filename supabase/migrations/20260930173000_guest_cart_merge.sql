-- Atomic, idempotent guest-cart merge. Prepared for migration; not applied to any remote project by this workspace.
-- Atomic, idempotent guest merge. Does not reserve or decrement inventory.
CREATE TABLE app_private.cart_merge_receipts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  payload jsonb NOT NULL,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, request_id)
);
ALTER TABLE app_private.cart_merge_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.cart_merge_receipts FROM PUBLIC, anon, authenticated;

CREATE FUNCTION app_private.merge_guest_cart(p_request_id uuid, p_items jsonb, p_expected_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  receipt app_private.cart_merge_receipts%ROWTYPE;
  cart_id_value uuid;
  line record;
  variant record;
  existing_id uuid;
  existing_quantity integer;
  accepted integer;
  capacity integer;
  output jsonb := '[]'::jsonb;
BEGIN
  IF actor IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
  IF actor IS DISTINCT FROM p_expected_user_id THEN RAISE EXCEPTION 'Account changed' USING ERRCODE='42501'; END IF;
  IF p_request_id IS NULL OR p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Invalid merge request';
  END IF;
  IF jsonb_array_length(p_items) > 100 OR octet_length(p_items::text) > 65536 THEN
    RAISE EXCEPTION 'Merge request too large';
  END IF;
  -- Validate every line before any mutation. Reject duplicate identities.
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) AS e(v)
    WHERE jsonb_typeof(v)<>'object'
      OR jsonb_typeof(v->'productId') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v->'color') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v->'size') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v->'quantity') IS DISTINCT FROM 'number'
  ) THEN RAISE EXCEPTION 'Invalid merge item'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_items) AS x("productId" uuid,color text,size text,quantity numeric)
    WHERE quantity < 1 OR quantity > 2147483647 OR quantity <> trunc(quantity)
      OR length(color) NOT BETWEEN 1 AND 200 OR length(size) NOT BETWEEN 1 AND 100
  ) THEN RAISE EXCEPTION 'Invalid merge quantity or options'; END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_items) AS x("productId" uuid,color text,size text,quantity numeric)
    GROUP BY "productId",color,size HAVING count(*)>1
  ) THEN RAISE EXCEPTION 'Duplicate merge identity'; END IF;

  INSERT INTO app_private.cart_merge_receipts(user_id,request_id,payload)
    VALUES(actor,p_request_id,p_items) ON CONFLICT DO NOTHING;
  SELECT * INTO STRICT receipt FROM app_private.cart_merge_receipts
    WHERE user_id=actor AND request_id=p_request_id FOR UPDATE;
  IF receipt.payload <> p_items THEN RAISE EXCEPTION 'Request identifier reused with different payload'; END IF;
  IF receipt.result IS NOT NULL THEN RETURN receipt.result; END IF;

  INSERT INTO public.carts(user_id) VALUES(actor) ON CONFLICT(user_id) DO NOTHING;
  SELECT id INTO STRICT cart_id_value FROM public.carts WHERE user_id=actor FOR UPDATE;
  -- Stable ordering prevents opposite variant lock order between different carts.
  FOR line IN
    SELECT * FROM jsonb_to_recordset(p_items) AS x("productId" uuid,color text,size text,quantity integer)
    ORDER BY "productId",color,size
  LOOP
    SELECT v.id,v.inventory INTO variant FROM public.product_variants v
      JOIN public.products p ON p.id=v.product_id
      WHERE v.product_id=line."productId" AND v.color=line.color AND v.size=line.size AND p.published
      FOR SHARE OF v,p;
    accepted:=0;
    IF FOUND THEN
      existing_id:=NULL;existing_quantity:=0;
      SELECT id,quantity INTO existing_id,existing_quantity FROM public.cart_items
        WHERE cart_id=cart_id_value AND variant_id=variant.id FOR UPDATE;
      existing_quantity:=coalesce(existing_quantity,0);
      capacity:=greatest(0,least(99,variant.inventory)-existing_quantity);
      accepted:=least(line.quantity,capacity);
      IF accepted>0 THEN
        IF existing_id IS NULL THEN
          INSERT INTO public.cart_items(cart_id,variant_id,quantity)
            VALUES(cart_id_value,variant.id,accepted);
        ELSE
          UPDATE public.cart_items SET quantity=existing_quantity+accepted WHERE id=existing_id;
        END IF;
      END IF;
    END IF;
    output:=output || jsonb_build_array(jsonb_build_object(
      'productId',line."productId",'color',line.color,'size',line.size,
      'accepted',accepted,'remaining',line.quantity-accepted));
  END LOOP;
  UPDATE app_private.cart_merge_receipts SET result=output
    WHERE user_id=actor AND request_id=p_request_id;
  RETURN output;
END;
$$;
REVOKE ALL ON FUNCTION app_private.merge_guest_cart(uuid,jsonb,uuid) FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.merge_guest_cart(uuid,jsonb,uuid) TO authenticated;
CREATE FUNCTION public.merge_guest_cart(p_request_id uuid,p_items jsonb,p_expected_user_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  SELECT app_private.merge_guest_cart(p_request_id,p_items,p_expected_user_id);
$$;
REVOKE ALL ON FUNCTION public.merge_guest_cart(uuid,jsonb,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.merge_guest_cart(uuid,jsonb,uuid) TO authenticated;

-- Normal cart mutations use the same parent-cart lock as merge. Stale absolute
-- quantities are rejected instead of overwriting quantities accepted by a merge.
REVOKE INSERT,UPDATE,DELETE ON public.cart_items FROM PUBLIC,anon,authenticated;
CREATE FUNCTION app_private.set_cart_quantity(p_variant uuid,p_expected integer,p_quantity integer,p_expected_user uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); cart uuid; item public.cart_items; stock integer; visible boolean;
BEGIN
 IF actor IS NULL OR actor IS DISTINCT FROM p_expected_user THEN RAISE EXCEPTION 'Account changed';END IF;
 IF p_expected IS NULL OR p_expected<0 OR p_quantity IS NULL OR p_quantity<0 OR (p_quantity>99 AND p_quantity>=p_expected) THEN RAISE EXCEPTION 'Invalid quantity';END IF;
 INSERT INTO public.carts(user_id) VALUES(actor) ON CONFLICT(user_id) DO NOTHING;
 SELECT id INTO STRICT cart FROM public.carts WHERE user_id=actor FOR UPDATE;
 SELECT v.inventory,p.published INTO stock,visible FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE v.id=p_variant FOR SHARE OF p,v;
 IF NOT FOUND THEN RAISE EXCEPTION 'Variant unavailable';END IF;
 SELECT * INTO item FROM public.cart_items WHERE cart_id=cart AND variant_id=p_variant FOR UPDATE;
 IF coalesce(item.quantity,0)<>p_expected THEN RAISE EXCEPTION 'Cart changed';END IF;
 IF p_quantity>coalesce(item.quantity,0) AND (NOT visible OR p_quantity>least(stock,99)) THEN RAISE EXCEPTION 'Stock insufficient';END IF;
 IF p_quantity=0 THEN DELETE FROM public.cart_items WHERE id=item.id;
 ELSIF item.id IS NULL THEN INSERT INTO public.cart_items(cart_id,variant_id,quantity) VALUES(cart,p_variant,p_quantity) RETURNING * INTO item;
 ELSE UPDATE public.cart_items SET quantity=p_quantity WHERE id=item.id RETURNING * INTO item;END IF;
 RETURN jsonb_build_object('cartId',cart,'itemId',CASE WHEN p_quantity=0 THEN NULL ELSE item.id END);
END $$;
REVOKE ALL ON FUNCTION app_private.set_cart_quantity(uuid,integer,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION app_private.set_cart_quantity(uuid,integer,integer,uuid) TO authenticated;
CREATE FUNCTION public.set_cart_quantity(p_variant uuid,p_expected integer,p_quantity integer,p_expected_user uuid)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT app_private.set_cart_quantity(p_variant,p_expected,p_quantity,p_expected_user)$$;
REVOKE ALL ON FUNCTION public.set_cart_quantity(uuid,integer,integer,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_cart_quantity(uuid,integer,integer,uuid) TO authenticated;
