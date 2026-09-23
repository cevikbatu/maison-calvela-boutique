import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../integrations/supabase/types';
import { measurementColumns, parseMeasurements, type MeasurementKey } from '../../lib/measurements.ts';
import { planVariantStock, saveVariantStock, type StockVariant } from './variant-stock.ts';

type Tables = Database['public']['Tables'];
export type ProductDraft = {
  title: string; slug: string; gender: string; category_id: string; description: string;
  fabric: string; production_note: string; model_height: string; model_size: string;
  size_measurements: Record<string, Partial<Record<MeasurementKey, string>>>;
  price: string; sizes: string; colors: string; stockInputs: Record<string, string>;
  featured: boolean; new_arrival: boolean; published: boolean; collection_id: string; images: string;
};
export type ProductSnapshot = {
  product: Tables['products']['Row'];
  variants: StockVariant[];
  price: Tables['product_prices']['Row'] | null;
  images: Tables['product_images']['Row'][];
  assignments: Tables['product_collections']['Row'][];
};

export function draftFromSnapshot(snapshot: ProductSnapshot): ProductDraft {
  const { product: p, variants, price, images, assignments } = snapshot;
  return {
    title: p.title, slug: p.slug, gender: p.gender, category_id: p.category_id,
    description: p.description, fabric: p.fabric, production_note: p.production_note,
    model_height: p.model_height, model_size: p.model_size,
    size_measurements: Object.fromEntries(Object.entries(parseMeasurements(p.size_measurements)).map(([size, row]) =>
      [size, Object.fromEntries(Object.entries(row).map(([key, value]) => [key, String(value)]))])),
    price: String(price?.price ?? 0), sizes: p.sizes.join(', '),
    colors: (Array.isArray(p.colors) ? p.colors : []).map(v => typeof v === 'object' && v && 'name' in v ? v['name'] : '').join(', '),
    stockInputs: Object.fromEntries(variants.map(v => [v.id, String(v.inventory)])),
    featured: p.featured, new_arrival: p.new_arrival, published: p.published,
    collection_id: assignments[0]?.collection_id ?? '',
    images: [...images].sort((a, b) => a.sort_order - b.sort_order).map(i => i.url).join('\n'),
  };
}

export async function readProductSnapshot(client: SupabaseClient<Database>, productId: string): Promise<ProductSnapshot> {
  const [p, v, pr, img, pc] = await Promise.all([
    client.from('products').select('*').eq('id', productId).single(),
    client.from('product_variants').select('*').eq('product_id', productId),
    client.from('product_prices').select('*').eq('product_id', productId).maybeSingle(),
    client.from('product_images').select('*').eq('product_id', productId),
    client.from('product_collections').select('*').eq('product_id', productId),
  ]);
  if (p.error || v.error || pr.error || img.error || pc.error || !p.data) {
    throw new Error('Güncel ürün bilgileri okunamadı. Yeniden yükleme tamamlanmadan kayıt yapılamaz.');
  }
  return { product: p.data, variants: v.data ?? [], price: pr.data, images: img.data ?? [], assignments: pc.data ?? [] };
}

function prepare(form: ProductDraft, variants: StockVariant[], uploads: File[]) {
  // Complete all synchronous validation before the first database/storage write.
  if (!form.title.trim() || !form.slug.trim() || !form.description.trim() || !form.category_id.trim()) {
    throw new Error('Ürün adı, bağlantısı, açıklaması ve kategorisi zorunludur.');
  }
  if (!['kadin', 'erkek'].includes(form.gender)) throw new Error('Geçerli bir ürün bölümü seçin.');
  const priceText = form.price.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(priceText) || !Number.isFinite(Number(priceText)) || Number(priceText) > 9999999999.99) {
    throw new Error('Fiyat 0 veya pozitif, en fazla iki ondalık basamaklı geçerli bir tutar olmalıdır.');
  }
  const options = (value: string) => value.split(',').map(x => x.trim());
  const sizes = options(form.sizes);
  const colorNames = options(form.colors);
  if ([...sizes, ...colorNames].some(value => !value || /[\u0000-\u001f]/.test(value))) {
    throw new Error('Renk ve bedenler boş olamaz; virgülle ayrılmış geçerli değerler girin.');
  }
  const colors = colorNames.map(name => ({ name, token: ({ 'Kırık Beyaz': 'ivory', Siyah: 'black', Zeytin: 'olive', Vizon: 'taupe', Antrasit: 'charcoal', Taş: 'stone' } as Record<string, string>)[name] ?? 'stone' }));
  const stockPlan = planVariantStock(variants, colorNames, sizes, form.stockInputs);
  for (const file of uploads) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
      throw new Error('Görsel JPG, PNG veya WebP olmalı ve 10 MB sınırını aşmamalı.');
    }
  }
  const size_measurements: Record<string, Partial<Record<MeasurementKey, number>>> = {};
  for (const size of sizes) {
    const values: Partial<Record<MeasurementKey, number>> = {};
    for (const { key } of measurementColumns) {
      const input = form.size_measurements[size]?.[key]?.trim();
      if (!input) continue;
      const value = Number(input);
      if (!Number.isFinite(value) || value <= 0) throw new Error(`${size} / ${key} için geçerli bir cm değeri girin.`);
      values[key] = value;
    }
    if (Object.keys(values).length) size_measurements[size] = values;
  }
  return {
    stockPlan, price: Number(priceText), imageUrls: form.images.split('\n').map(x => x.trim()).filter(Boolean),
    payload: {
      title: form.title.trim(), slug: form.slug.trim(), gender: form.gender, category_id: form.category_id,
      description: form.description, fabric: form.fabric, production_note: form.production_note,
      model_height: form.model_height, model_size: form.model_size, size_measurements, sizes, colors,
      featured: form.featured, new_arrival: form.new_arrival, published: form.published,
    },
  };
}

type SaveResult = {
  ok: boolean; productId: string | null; snapshot: ProductSnapshot | null;
  message: string; reloadRequired: boolean;
};

// The dashboard and integration tests use this same complete save/recovery sequence.
export async function saveAdminProduct(client: SupabaseClient<Database>, input: {
  productId: string | null; form: ProductDraft; variants: StockVariant[]; uploads: File[];
}): Promise<SaveResult> {
  let productId = input.productId;
  let attemptedWrite = false;
  let created = false;
  const checked = (error: { message: string } | null) => { if (error) throw new Error(error.message); };
  try {
    const prepared = prepare(input.form, input.variants, input.uploads);
    // From this point an unsuccessful response cannot prove that no write occurred.
    attemptedWrite = true;
    if (!productId) {
      const { data, error } = await client.from('products').insert(prepared.payload).select('id').single();
      checked(error);
      if (!data) throw new Error('Ürün oluşturulamadı.');
      productId = data.id;
      created = true;
    }
    await saveVariantStock(client, productId, prepared.stockPlan);
    if (!created) {
      const { error } = await client.from('products').update(prepared.payload).eq('id', productId);
      checked(error);
    }
    const price = await client.from('product_prices').upsert({ product_id: productId, price: prepared.price });
    checked(price.error);
    for (const file of input.uploads) {
      const key = `${productId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
      const { error } = await client.storage.from('catalog').upload(key, file, { contentType: file.type, upsert: false });
      checked(error);
      prepared.imageUrls.push(`catalog/${key}`);
    }
    // Do not rely on pre-save image/assignment snapshots after a partial failure.
    const imageDelete = await client.from('product_images').delete().eq('product_id', productId);
    checked(imageDelete.error);
    if (prepared.imageUrls.length) {
      const { error } = await client.from('product_images').insert(prepared.imageUrls.map((url, sort_order) => ({ product_id: productId!, url, sort_order, alt: input.form.title })));
      checked(error);
    }
    const assignmentDelete = await client.from('product_collections').delete().eq('product_id', productId);
    checked(assignmentDelete.error);
    if (input.form.collection_id) {
      const { error } = await client.from('product_collections').insert({ product_id: productId, collection_id: input.form.collection_id });
      checked(error);
    }
    const snapshot = await readProductSnapshot(client, productId);
    return { ok: true, productId, snapshot, message: 'Ürün kaydedildi.', reloadRequired: false };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'İşlem tamamlanamadı.';
    if (!attemptedWrite) return { ok: false, productId, snapshot: null, message: reason, reloadRequired: false };
    if (productId) {
      try {
        const snapshot = await readProductSnapshot(client, productId);
        const message = created
          ? 'Ürün oluşturuldu ancak bazı alanlar kaydedilemedi. Güncel durum yeniden yüklendi.'
          : 'Bazı değişiklikler kaydedilmiş olabilir. Güncel veriler yeniden yüklendi.';
        return { ok: false, productId, snapshot, message: `${reason} ${message}`, reloadRequired: false };
      } catch {
        return { ok: false, productId, snapshot: null, message: `${reason} Bazı değişiklikler kaydedilmiş olabilir. Güncel veriler okunamadı; yeniden yükleme tamamlanmadan kayıt yapılamaz.`, reloadRequired: true };
      }
    }
    // An INSERT response can be lost after the server committed. Do not blindly retry it.
    return { ok: false, productId: null, snapshot: null, message: `${reason} Ürün oluşturma sonucu doğrulanamadı. Sayfayı yenileyip ürün listesini kontrol edin; yeniden kayıt engellendi.`, reloadRequired: true };
  }
}
