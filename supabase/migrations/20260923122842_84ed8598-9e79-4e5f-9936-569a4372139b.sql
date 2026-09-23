INSERT INTO public.product_variants (product_id, size, color, inventory)
SELECT p.id, s.size, c.color, 0
FROM public.products p
CROSS JOIN LATERAL jsonb_array_elements_text(to_jsonb(p.sizes)) AS s(size)
CROSS JOIN LATERAL jsonb_array_elements(to_jsonb(p.colors)) AS color_row(value)
CROSS JOIN LATERAL (SELECT color_row.value->>'name' AS color) c
WHERE c.color IS NOT NULL AND c.color <> ''
ON CONFLICT (product_id, size, color) DO NOTHING;