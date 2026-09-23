import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../integrations/supabase/types';

export type StockVariant = Database['public']['Tables']['product_variants']['Row'];
type StockPlan = {
  updates: { variant: StockVariant; inventory: number }[];
  removals: StockVariant[];
  additions: { color: string; size: string; inventory: number }[];
};

export const variantKey = (color: string, size: string) => JSON.stringify([color, size]);

export function parseInventory(value: string, label: string): number {
  if (!/^\d+$/.test(value.trim())) throw new Error(`${label}: Stok 0 veya pozitif tam sayı olmalıdır.`);
  const inventory = Number(value);
  if (!Number.isSafeInteger(inventory) || inventory > 2147483647) {
    throw new Error(`${label}: Stok 0–2147483647 arasında tam sayı olmalıdır.`);
  }
  return inventory;
}

export function planVariantStock(
  variants: StockVariant[], colors: string[], sizes: string[], inputs: Record<string, string>,
): StockPlan {
  if (!colors.length || !sizes.length) throw new Error('En az bir beden ve renk ekleyin.');
  if (new Set(colors).size !== colors.length || new Set(sizes).size !== sizes.length) {
    throw new Error('Aynı renk veya beden birden fazla kez girilemez.');
  }
  const existing = new Map(variants.map(v => [variantKey(v.color, v.size), v]));
  const desired = new Set(colors.flatMap(color => sizes.map(size => variantKey(color, size))));
  const plan: StockPlan = { updates: [], removals: [], additions: [] };
  for (const variant of variants) {
    if (!desired.has(variantKey(variant.color, variant.size))) {
      if (variant.inventory > 0) throw new Error(`${variant.color} / ${variant.size}: Stoklu varyant kaldırılamaz. Önce stok durumunu ayrıca düzenleyip kaydedin.`);
      plan.removals.push(variant);
      continue;
    }
    const inventory = parseInventory(inputs[variant.id] ?? '', `${variant.color} / ${variant.size}`);
    if (inventory !== variant.inventory) plan.updates.push({ variant, inventory });
  }
  for (const color of colors) for (const size of sizes) {
    if (!existing.has(variantKey(color, size))) plan.additions.push({ color, size, inventory: 0 });
  }
  return plan;
}

const conflict = () => new Error('Varyant bilgileri başka bir işlemde değişti. Sayfayı yenileyip güncel stokları kontrol edin.');
const referenced = () => new Error('Sepet veya sipariş kaydında kullanılan varyant kaldırılamaz. Renk ve beden seçimini koruyun.');

// Uses the signed-in admin client and existing RLS; never uses a service role key.
export async function saveVariantStock(client: SupabaseClient<Database>, productId: string, plan: StockPlan) {
  if (!plan.updates.length && !plan.removals.length && !plan.additions.length) return;
  const { data: current, error: readError } = await client.from('product_variants').select('*').eq('product_id', productId);
  if (readError) throw new Error('Güncel varyant stokları okunamadı. Lütfen tekrar deneyin.');
  for (const variant of [...plan.removals, ...plan.updates.map(u => u.variant)]) {
    const fresh = current?.find(v => v.id === variant.id);
    if (!fresh || fresh.updated_at !== variant.updated_at || fresh.inventory !== variant.inventory) throw conflict();
  }
  if (plan.removals.length) {
    const ids = plan.removals.map(v => v.id);
    // RLS may hide other customers' cart rows; the FK check on DELETE is the final safeguard.
    const [cart, orders] = await Promise.all([
      client.from('cart_items').select('id').in('variant_id', ids).limit(1),
      client.from('order_items').select('id').in('variant_id', ids).limit(1),
    ]);
    if (cart.error || orders.error) throw new Error('Varyant bağlantıları kontrol edilemedi. Kaldırma işlemi yapılmadı.');
    if (cart.data?.length || orders.data?.length) throw referenced();
  }
  if (plan.removals.length) {
    // One DELETE statement: a foreign-key failure rolls back the entire deletion.
    // Keep each row's own timestamp in the predicate, not a shared timestamp list.
    const guards = plan.removals.map(v =>
      `and(id.eq.${JSON.stringify(v.id)},updated_at.eq.${JSON.stringify(v.updated_at)})`,
    ).join(',');
    const { data, error } = await client.from('product_variants').delete()
      .eq('product_id', productId).eq('inventory', 0).or(guards).select('id');
    if (error?.code === '23503') throw referenced();
    if (error) throw new Error('Varyant kaldırılamadı. Güncel durumu kontrol edip tekrar deneyin.');
    // A concurrent change can exclude rows even though the statement succeeded.
    // The caller must reload the actual state before allowing another save.
    if (data?.length !== plan.removals.length) throw conflict();
  }
  for (const { variant, inventory } of plan.updates) {
    const { data, error } = await client.from('product_variants').update({ inventory })
      .eq('id', variant.id).eq('product_id', productId).eq('inventory', variant.inventory)
      .eq('updated_at', variant.updated_at).select('id');
    if (error) throw new Error('Varyant stoğu kaydedilemedi. Güncel durumu kontrol edip tekrar deneyin.');
    if (data?.length !== 1) throw conflict();
  }
  if (plan.additions.length) {
    const { error } = await client.from('product_variants').upsert(
      plan.additions.map(v => ({ ...v, product_id: productId })),
      { onConflict: 'product_id,color,size', ignoreDuplicates: true },
    );
    if (error) throw new Error('Yeni varyantlar oluşturulamadı. Güncel durumu kontrol edip tekrar deneyin.');
  }
}
