import assert from 'node:assert/strict';
import { test } from 'node:test';
import { saveAdminProduct, draftFromSnapshot } from '../src/components/admin/product-save.ts';
import { planVariantStock, saveVariantStock } from '../src/components/admin/variant-stock.ts';

const sizes = ['S', 'M', 'L', 'XL'];
const fixture = () => sizes.map((size, i) => ({
  id: `variant-${size}`, product_id: 'product-1', color: 'Siyah', size,
  inventory: [5, 8, 3, 0][i], sku: `SKU-${size}`,
  created_at: '2026-09-23T10:00:00Z', updated_at: '2026-09-23T10:00:00Z',
}));
const inputs = rows => Object.fromEntries(rows.map(v => [v.id, String(v.inventory)]));

// In-memory PostgREST substitute: no environment variables, fetch, or real database.
function mockClient(initial, options = {}) {
  const rows = structuredClone(initial);
  const writes = [];
  const reads = [];
  return {
    rows, writes, reads,
    from(table) {
      let action = 'select', payload, upsertOptions;
      const filters = [];
      const query = {
        select() { return query; },
        eq(key, value) { filters.push(row => row[key] === value); return query; },
        in(key, values) { filters.push(row => values.includes(row[key])); return query; },
        limit() { return query; },
        or(expression) {
          const guards = [...expression.matchAll(/and\(id\.eq\."([^"]+)",updated_at\.eq\."([^"]+)"\)/g)];
          assert.ok(guards.length);
          filters.push(row => guards.some(([, id, stamp]) => row.id === id && row.updated_at === stamp));
          return query;
        },
        update(value) { action = 'update'; payload = value; return query; },
        delete() { action = 'delete'; return query; },
        upsert(value, opts) { action = 'upsert'; payload = value; upsertOptions = opts; return query; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            if (action === 'select') {
              reads.push(table);
              if (table !== 'product_variants') return { data: options.references?.[table] ?? [], error: null };
              return { data: structuredClone(rows.filter(row => filters.every(f => f(row)))), error: null };
            }
            assert.equal(table, 'product_variants');
            options.beforeWrite?.(rows, action);
            const matches = rows.filter(row => filters.every(f => f(row)));
            writes.push({ action, payload, upsertOptions, ids: matches.map(v => v.id) });
            if (action === 'delete' && options.foreignKey) return { data: null, error: { code: '23503' } };
            if (action === 'update') matches.forEach(row => Object.assign(row, payload));
            if (action === 'delete') matches.forEach(row => rows.splice(rows.indexOf(row), 1));
            if (action === 'upsert') {
              assert.equal(upsertOptions.onConflict, 'product_id,color,size');
              assert.equal(upsertOptions.ignoreDuplicates, true);
              for (const value of payload) {
                const existing = rows.find(row => row.product_id === value.product_id && row.color === value.color && row.size === value.size);
                if (!existing) rows.push({ ...value, id: `new-${rows.length}`, sku: null });
              }
            }
            return { data: matches.map(v => ({ id: v.id })), error: null };
          }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

test('A/B: 5,8,3,0 stocks and identities survive a metadata-only save without variant writes', async () => {
  const original = fixture();
  const client = mockClient(original);
  const plan = planVariantStock(original, ['Siyah'], sizes, inputs(original));
  await saveVariantStock(client, 'product-1', plan);
  assert.deepEqual(client.rows, original);
  assert.deepEqual(client.writes, []);
  assert.deepEqual(client.reads, []);
});

test('C: only Siyah/M changes from 8 to 10; UUID, SKU and other stocks survive', async () => {
  const original = fixture();
  const client = mockClient(original);
  const values = { ...inputs(original), 'variant-M': '10' };
  await saveVariantStock(client, 'product-1', planVariantStock(original, ['Siyah'], sizes, values));
  assert.deepEqual(client.writes.map(w => ({ action: w.action, payload: w.payload, ids: w.ids })), [
    { action: 'update', payload: { inventory: 10 }, ids: ['variant-M'] },
  ]);
  assert.deepEqual(client.rows, original.map(v => v.size === 'M' ? { ...v, inventory: 10 } : v));
});

test('D: new color and size create only missing combinations with zero stock', async () => {
  const original = fixture();
  const client = mockClient(original);
  await saveVariantStock(client, 'product-1', planVariantStock(original, ['Siyah', 'Beyaz'], [...sizes, 'XS'], inputs(original)));
  assert.equal(client.rows.length, 10);
  assert.deepEqual(client.rows.slice(0, 4), original);
  assert.ok(client.rows.slice(4).every(v => v.inventory === 0));
  assert.deepEqual(client.writes.map(w => w.action), ['upsert']);
});

test('D: a concurrently created combination is never overwritten', async () => {
  const original = fixture();
  const concurrent = { ...original[0], id: 'concurrent', color: 'Beyaz', inventory: 17, sku: 'KEEP' };
  const client = mockClient([...original, concurrent]);
  await saveVariantStock(client, 'product-1', planVariantStock(original, ['Siyah', 'Beyaz'], sizes, inputs(original)));
  assert.deepEqual(client.rows.find(v => v.id === 'concurrent'), concurrent);
});

test('E: removing a stocked variant fails before any database operation', () => {
  const original = fixture();
  assert.throws(() => planVariantStock(original, ['Siyah'], ['M', 'L', 'XL'], inputs(original)), /Stoklu varyant kaldırılamaz/);
  // Entering zero and removing the size in one save cannot bypass this safeguard.
  assert.throws(() => planVariantStock(original, ['Siyah'], ['M', 'L', 'XL'], { ...inputs(original), 'variant-S': '0' }), /Stoklu varyant/);
});

for (const value of ['-1', '1.5', '', ' ', 'abc', 'NaN', 'Infinity', '2147483648']) {
  test(`F/G: invalid inventory ${JSON.stringify(value)} is rejected`, () => {
    const original = fixture();
    assert.throws(() => planVariantStock(original, ['Siyah'], sizes, { ...inputs(original), 'variant-M': value }), /tam sayı/);
  });
}

test('zero inventory is an explicit valid update', async () => {
  const original = fixture();
  const client = mockClient(original);
  await saveVariantStock(client, 'product-1', planVariantStock(original, ['Siyah'], sizes, { ...inputs(original), 'variant-S': '0' }));
  assert.equal(client.rows[0].inventory, 0);
});

test('zero-stock unreferenced variant can be removed without recreating others', async () => {
  const original = fixture();
  const client = mockClient(original);
  await saveVariantStock(client, 'product-1', planVariantStock(original, ['Siyah'], sizes.slice(0, 3), inputs(original)));
  assert.deepEqual(client.rows, original.slice(0, 3));
  assert.deepEqual(client.writes.map(w => w.action), ['delete']);
});

for (const table of ['cart_items', 'order_items']) {
  test(`referenced zero-stock variant in ${table} is protected before writes`, async () => {
    const original = fixture();
    const client = mockClient(original, { references: { [table]: [{ id: 'reference' }] } });
    await assert.rejects(saveVariantStock(client, 'product-1', planVariantStock(original, ['Siyah'], sizes.slice(0, 3), inputs(original))), /Sepet veya sipariş/);
    assert.deepEqual(client.writes, []);
  });
}

test('FK protects references hidden by RLS and reports a readable error', async () => {
  const original = fixture();
  const client = mockClient(original, { foreignKey: true });
  await assert.rejects(saveVariantStock(client, 'product-1', planVariantStock(original, ['Siyah'], sizes.slice(0, 3), inputs(original))), /Sepet veya sipariş/);
  assert.deepEqual(client.rows, original);
});

test('stale inventory snapshot is rejected before writes', async () => {
  const original = fixture();
  const fresh = original.map(v => v.size === 'M' ? { ...v, inventory: 6, updated_at: '2026-09-23T11:00:00Z' } : v);
  const client = mockClient(fresh);
  await assert.rejects(saveVariantStock(client, 'product-1', planVariantStock(original, ['Siyah'], sizes, { ...inputs(original), 'variant-M': '10' })), /başka bir işlemde/);
  assert.deepEqual(client.writes, []);
});

for (const action of ['update', 'delete']) {
  test(`updated_at guard catches a race after preflight during ${action}`, async () => {
    const original = fixture();
    const id = action === 'update' ? 'variant-M' : 'variant-XL';
    const client = mockClient(original, { beforeWrite(rows) {
      Object.assign(rows.find(v => v.id === id), { inventory: 21, updated_at: '2026-09-23T12:00:00Z' });
    } });
    const plan = planVariantStock(original, ['Siyah'], action === 'delete' ? sizes.slice(0, 3) : sizes, { ...inputs(original), 'variant-M': action === 'update' ? '10' : '8' });
    await assert.rejects(saveVariantStock(client, 'product-1', plan), /başka bir işlemde/);
    assert.equal(client.rows.find(v => v.id === id).inventory, 21);
  });
}

test('duplicate options are rejected instead of generating ambiguous writes', () => {
  assert.throws(() => planVariantStock([], ['Siyah', 'Siyah'], sizes, {}), /birden fazla/);
  assert.throws(() => planVariantStock([], ['Siyah'], ['S', 'S'], {}), /birden fazla/);
});

// Integration-style fake for the SAME save sequence invoked by dashboard.save().
// Includes trigger timestamps, recovery reads and atomic FK failure on bulk DELETE.
function adminFixture() {
  return {
    product: { id: 'product-1', title: 'Test Ürünü', slug: 'test-urun', gender: 'kadin', category_id: 'category-1',
      description: 'Açıklama', fabric: '', production_note: '', model_height: '', model_size: '', size_measurements: {},
      colors: [{ name: 'Siyah', token: 'black' }], sizes, featured: false, new_arrival: false, published: false },
    variants: fixture(), price: { product_id: 'product-1', price: 100 }, images: [], assignments: [],
  };
}
function adminClient(snapshot, options = {}) {
  const db = {
    products: snapshot ? [structuredClone(snapshot.product)] : [],
    product_variants: structuredClone(snapshot?.variants ?? []),
    product_prices: snapshot?.price ? [structuredClone(snapshot.price)] : [],
    product_images: structuredClone(snapshot?.images ?? []),
    product_collections: structuredClone(snapshot?.assignments ?? []), cart_items: [], order_items: [],
  };
  const calls = [];
  let revision = 0;
  const client = {
    db, calls,
    storage: { from: () => ({ upload: async () => {
      const call = { table: 'storage', action: 'upload' }; calls.push(call);
      return { error: options.fail?.(call) ? { message: 'mock upload failure' } : null };
    } }) },
    from(table) {
      let action = 'select', payload, opts, single = false;
      const filters = [];
      const q = {
        select() { return q; }, single() { single = true; return q; }, maybeSingle() { single = true; return q; },
        eq(key, value) { filters.push(row => row[key] === value); return q; },
        in(key, values) { filters.push(row => values.includes(row[key])); return q; },
        limit() { return q; },
        or(expression) {
          const guards = [...expression.matchAll(/and\(id\.eq\."([^"]+)",updated_at\.eq\."([^"]+)"\)/g)];
          assert.ok(guards.length);
          filters.push(row => guards.some(([, id, stamp]) => row.id === id && row.updated_at === stamp));
          return q;
        },
        update(value) { action = 'update'; payload = value; return q; },
        insert(value) { action = 'insert'; payload = value; return q; },
        upsert(value, config) { action = 'upsert'; payload = value; opts = config; return q; },
        delete() { action = 'delete'; return q; },
        then(resolve, reject) {
          return Promise.resolve().then(() => {
            const call = { table, action, payload, opts }; calls.push(call);
            if (options.fail?.(call)) return { data: null, error: { message: `mock ${table} ${action} failure` } };
            if (action !== 'select') options.beforeWrite?.(db, call);
            const rows = db[table];
            let matches = rows.filter(row => filters.every(f => f(row)));
            if (action === 'delete') {
              if (table === 'product_variants' && matches.some(row => options.hiddenReferences?.includes(row.id))) {
                return { data: null, error: { code: '23503', message: 'foreign key' } };
              }
              matches.forEach(row => rows.splice(rows.indexOf(row), 1));
            }
            if (action === 'update') matches.forEach(row => Object.assign(row, payload, { updated_at: `revision-${++revision}` }));
            if (action === 'insert' || action === 'upsert') {
              matches = [];
              for (const value of Array.isArray(payload) ? payload : [payload]) {
                const existing = action === 'upsert' && rows.find(row => table === 'product_variants'
                  ? row.product_id === value.product_id && row.color === value.color && row.size === value.size
                  : row.product_id === value.product_id);
                if (existing) { if (!opts?.ignoreDuplicates) Object.assign(existing, value); matches.push(existing); }
                else {
                  const row = { id: table === 'products' ? 'created-product' : `new-${++revision}`, sku: null, updated_at: `revision-${++revision}`, ...value };
                  rows.push(row); matches.push(row);
                }
              }
            }
            return { data: structuredClone(single ? matches[0] ?? null : matches), error: null };
          }).then(resolve, reject);
        },
      };
      return q;
    },
  };
  return client;
}
const saveInput = snapshot => ({ productId: snapshot.product.id, form: draftFromSnapshot(snapshot), variants: snapshot.variants, uploads: [] });
const retryInput = result => ({ productId: result.productId, form: draftFromSnapshot(result.snapshot), variants: result.snapshot.variants, uploads: [] });
const writesOf = client => client.calls.filter(c => c.action !== 'select');

test('A: a hidden FK on the second removal rolls back the entire bulk DELETE and reloads the form', async () => {
  const snapshot = adminFixture(); snapshot.variants[0].inventory = 0; snapshot.variants[1].inventory = 0;
  const client = adminClient(snapshot, { hiddenReferences: ['variant-M'] });
  const input = saveInput(snapshot); input.form.sizes = 'L, XL';
  const result = await saveAdminProduct(client, input);
  assert.equal(result.ok, false);
  assert.match(result.message, /Güncel veriler yeniden yüklendi/);
  assert.deepEqual(result.snapshot.variants, snapshot.variants);
  assert.equal(client.calls.filter(c => c.table === 'product_variants' && c.action === 'delete').length, 1);
  const retry = await saveAdminProduct(client, retryInput(result));
  assert.equal(retry.ok, true);
  assert.equal(client.calls.filter(c => c.table === 'product_variants' && c.action === 'delete').length, 1);
});

test('A/H: concurrent change excludes a row from bulk DELETE; actual remaining rows replace the old plan', async () => {
  const snapshot = adminFixture(); snapshot.variants[0].inventory = 0; snapshot.variants[1].inventory = 0;
  const client = adminClient(snapshot, { beforeWrite(db, call) {
    if (call.table === 'product_variants' && call.action === 'delete') Object.assign(db.product_variants[1], { inventory: 9, updated_at: 'other-admin' });
  } });
  const input = saveInput(snapshot); input.form.sizes = 'L, XL';
  const result = await saveAdminProduct(client, input);
  assert.equal(result.ok, false);
  assert.equal(result.snapshot.variants.some(v => v.id === 'variant-S'), false);
  assert.equal(result.snapshot.variants.find(v => v.id === 'variant-M').inventory, 9);
  const next = retryInput(result);
  assert.equal(next.form.stockInputs['variant-M'], '9');
  const retry = await saveAdminProduct(client, next);
  assert.equal(retry.ok, true);
  assert.equal(client.calls.filter(c => c.table === 'product_variants' && c.action === 'delete').length, 1);
});

test('B/H: second stock update fails; first updated_at and inventory are reloaded before retry', async () => {
  const snapshot = adminFixture(); let updates = 0;
  const client = adminClient(snapshot, { fail: call => call.table === 'product_variants' && call.action === 'update' && ++updates === 2 });
  const input = saveInput(snapshot); input.form.stockInputs['variant-S'] = '6'; input.form.stockInputs['variant-M'] = '10';
  const result = await saveAdminProduct(client, input);
  assert.equal(result.ok, false);
  assert.equal(result.snapshot.variants[0].inventory, 6);
  assert.notEqual(result.snapshot.variants[0].updated_at, snapshot.variants[0].updated_at);
  assert.equal(result.snapshot.variants[1].inventory, 8);
  const next = retryInput(result); next.form.stockInputs['variant-M'] = '10';
  const retry = await saveAdminProduct(client, next);
  assert.equal(retry.ok, true);
  assert.deepEqual(retry.snapshot.variants.map(v => v.inventory), [6, 10, 3, 0]);
  assert.equal(updates, 3);
});

for (const [scenario, table, action] of [['C', 'products', 'update'], ['D', 'product_prices', 'upsert'], ['E', 'product_images', 'insert'], ['E-upload', 'storage', 'upload'], ['collection', 'product_collections', 'insert']]) {
  test(`${scenario}/H: ${table} failure after stock save refreshes state; retry never replays that stock update`, async () => {
    const snapshot = adminFixture(); let failed = false;
    const client = adminClient(snapshot, { fail(call) { if (!failed && call.table === table && call.action === action) { failed = true; return true; } } });
    const input = saveInput(snapshot); input.form.stockInputs['variant-M'] = '10'; input.form.images = '/images/test.jpg'; input.form.collection_id = 'collection-1';
    if (table === 'storage') input.uploads = [{ type: 'image/jpeg', size: 20, name: 'test.jpg' }];
    const result = await saveAdminProduct(client, input);
    assert.equal(result.ok, false);
    assert.equal(result.reloadRequired, false);
    const next = retryInput(result);
    assert.equal(next.form.stockInputs['variant-M'], '10');
    assert.notEqual(next.variants[1].updated_at, snapshot.variants[1].updated_at);
    assert.equal((await saveAdminProduct(client, next)).ok, true);
    assert.equal(client.calls.filter(c => c.table === 'product_variants' && c.action === 'update').length, 1);
  });
}

for (const upload of [{ type: 'image/jpeg', size: 10485761, name: 'large.jpg' }, { type: 'text/plain', size: 5, name: 'bad.txt' }]) {
  test(`F: invalid upload ${upload.name} fails before ANY write`, async () => {
    const snapshot = adminFixture(); const client = adminClient(snapshot); const input = saveInput(snapshot);
    input.form.stockInputs['variant-M'] = '10'; input.uploads = [upload];
    const result = await saveAdminProduct(client, input);
    assert.equal(result.ok, false); assert.equal(result.snapshot, null); assert.equal(result.reloadRequired, false);
    assert.deepEqual(writesOf(client), []);
  });
}

for (const [field, value] of [['title', ' '], ['slug', ''], ['description', ''], ['category_id', ''], ['price', ''], ['price', '-1'], ['price', 'NaN'], ['price', '1.234'], ['sizes', 'S,,M'], ['colors', 'Siyah, Siyah'], ['gender', 'invalid']]) {
  test(`local ${field}=${JSON.stringify(value)} validation precedes all writes`, async () => {
    const snapshot = adminFixture(); const client = adminClient(snapshot); const input = saveInput(snapshot); input.form[field] = value;
    const result = await saveAdminProduct(client, input);
    assert.equal(result.ok, false); assert.deepEqual(writesOf(client), []);
  });
}

test('G/H: created product ID survives variant failure and retry updates instead of inserting again', async () => {
  let failed = false;
  const client = adminClient(null, { fail(call) { if (!failed && call.table === 'product_variants' && call.action === 'upsert') { failed = true; return true; } } });
  const input = saveInput(adminFixture()); input.productId = null; input.variants = []; input.form.stockInputs = {};
  const result = await saveAdminProduct(client, input);
  assert.equal(result.ok, false); assert.equal(result.productId, 'created-product');
  assert.match(result.message, /Ürün oluşturuldu/);
  assert.deepEqual(result.snapshot.variants, []);
  const retry = await saveAdminProduct(client, retryInput(result));
  assert.equal(retry.ok, true); assert.equal(retry.snapshot.variants.length, 4);
  assert.ok(retry.snapshot.variants.every(v => v.inventory === 0));
  assert.equal(client.calls.filter(c => c.table === 'products' && c.action === 'insert').length, 1);
});

test('I: successful save returns fresh timestamps; reopening and saving untouched stocks is a no-op', async () => {
  const snapshot = adminFixture(); const client = adminClient(snapshot); const input = saveInput(snapshot);
  input.form.stockInputs['variant-M'] = '10';
  const result = await saveAdminProduct(client, input);
  assert.equal(result.ok, true);
  assert.notEqual(result.snapshot.variants[1].updated_at, snapshot.variants[1].updated_at);
  assert.equal((await saveAdminProduct(client, retryInput(result))).ok, true);
  assert.equal(client.calls.filter(c => c.table === 'product_variants' && c.action === 'update').length, 1);
});

test('recovery read failure explicitly blocks saving the old form snapshot', async () => {
  const snapshot = adminFixture(); let failed = false;
  const client = adminClient(snapshot, { fail(call) {
    if (call.table === 'products' && call.action === 'update') { failed = true; return true; }
    return failed && call.table === 'product_variants' && call.action === 'select';
  } });
  const input = saveInput(snapshot); input.form.stockInputs['variant-M'] = '10';
  const result = await saveAdminProduct(client, input);
  assert.equal(result.ok, false); assert.equal(result.reloadRequired, true); assert.equal(result.snapshot, null);
  assert.match(result.message, /okunamadı/);
});

test('uncertain new INSERT response prevents a blind duplicate INSERT', async () => {
  const client = adminClient(null, { fail: call => call.table === 'products' && call.action === 'insert' });
  const input = saveInput(adminFixture()); input.productId = null; input.variants = []; input.form.stockInputs = {};
  const result = await saveAdminProduct(client, input);
  assert.equal(result.reloadRequired, true); assert.equal(result.productId, null);
  assert.match(result.message, /yeniden kayıt engellendi/);
});
