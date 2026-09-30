import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

// Optional isolated PostgreSQL runtime. Never connects to Supabase or a network DB.
const runtime=process.env.MC_PGLITE_MODULE;
test('guest merge SQL draft in isolated PostgreSQL', {skip:!runtime}, async t=>{
 const {PGlite}=await import(pathToFileURL(runtime).href);
 const db=new PGlite();
 const user='10000000-0000-0000-0000-000000000001';
 const other='10000000-0000-0000-0000-000000000002';
 const product='20000000-0000-0000-0000-000000000001';
 const variant='30000000-0000-0000-0000-000000000001';
 let sequence=0;
 const id=()=>`40000000-0000-0000-0000-${String(++sequence).padStart(12,'0')}`;
 const line=(quantity=3,color='Siyah',size='S')=>({productId:product,color,size,quantity});
 try {
 await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated;
 CREATE SCHEMA auth;CREATE SCHEMA app_private;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.user',true),'')::uuid $$;
 CREATE TABLE public.products(id uuid PRIMARY KEY,published boolean NOT NULL);
 CREATE TABLE public.product_variants(id uuid PRIMARY KEY,product_id uuid REFERENCES products(id),color text,size text,inventory integer NOT NULL CHECK(inventory>=0),UNIQUE(product_id,color,size));
 CREATE TABLE public.carts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid UNIQUE REFERENCES auth.users(id));
 CREATE TABLE public.cart_items(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),cart_id uuid REFERENCES carts(id),variant_id uuid REFERENCES product_variants(id),quantity integer CHECK(quantity>0),UNIQUE(cart_id,variant_id));
 INSERT INTO auth.users VALUES('${user}'),('${other}');
 INSERT INTO products VALUES('${product}',true);
 INSERT INTO product_variants VALUES('${variant}','${product}','Siyah','S',5);
 `);
 await db.exec(readFileSync(new URL('../docs/drafts/guest-cart-merge.sql',import.meta.url),'utf8'));
 async function asUser(who=user){await db.query("SELECT set_config('test.user',$1,false)",[who]);await db.exec('SET ROLE authenticated');}
 async function merge(request,items){return (await db.query('SELECT public.merge_guest_cart($1,$2::jsonb) result',[request,JSON.stringify(items)])).rows[0].result;}
 async function quantity(who=user){await db.exec('RESET ROLE');return (await db.query('SELECT i.quantity FROM cart_items i JOIN carts c ON c.id=i.cart_id WHERE c.user_id=$1 AND i.variant_id=$2',[who,variant])).rows[0]?.quantity;}
 await t.test('authenticated merge respects total stock and returns unmerged remainder',async()=>{
  await asUser();await merge(id(),[line(3)]);const result=await merge(id(),[line(3)]);
  assert.equal(result[0].accepted,2);assert.equal(result[0].remaining,1);assert.equal(await quantity(),5);
 });
 await t.test('lost response retry replays receipt, never adds twice',async()=>{
  await asUser(other);const request=id();const first=await merge(request,[line(2)]);
  assert.deepEqual(await merge(request,[line(2)]),first);assert.equal(await quantity(other),2);
 });
 await t.test('same token cannot be reused for different payload',async()=>{
  await asUser(other);const request=id();await merge(request,[line(1)]);
  await assert.rejects(merge(request,[line(2)]),/different payload/);
 });
 await t.test('zero and missing combinations stay in remainder; inventory unchanged',async()=>{
  await db.exec('RESET ROLE');await db.query('UPDATE product_variants SET inventory=0 WHERE id=$1',[variant]);
  await asUser();const result=await merge(id(),[line(1),line(4,'Beyaz')]);
  assert.ok(result.every(v=>v.accepted===0));assert.equal(await quantity(),5);
  assert.equal((await db.query('SELECT inventory FROM product_variants WHERE id=$1',[variant])).rows[0].inventory,0);
 });
 await t.test('negative fractional missing and duplicate quantities reject atomically',async()=>{
  await asUser();for(const items of [[line(-1)],[line(1.5)],[{...line(),quantity:null}],[line(),line()]])await assert.rejects(merge(id(),items));
  assert.equal(await quantity(),5);
 });
 await t.test('99 limit is independent of high inventory',async()=>{
  await db.exec('RESET ROLE');await db.query('UPDATE product_variants SET inventory=200 WHERE id=$1',[variant]);
  await asUser();const result=await merge(id(),[line(200)]);assert.equal(result[0].accepted,94);assert.equal(result[0].remaining,106);assert.equal(await quantity(),99);
 });
 await t.test('unpublished products cannot be merged by privileged implementation',async()=>{
  await db.query('UPDATE products SET published=false WHERE id=$1',[product]);await asUser(other);
  assert.equal((await merge(id(),[line(1)]))[0].accepted,0);await db.exec('RESET ROLE');
 });
 await t.test('caller cannot read or forge receipts',async()=>{
  await asUser();await assert.rejects(db.exec('SELECT * FROM app_private.cart_merge_receipts'),/permission denied/);await db.exec('RESET ROLE');
 });
 await t.test('anonymous and missing identity are denied',async()=>{
  await db.exec('SET ROLE anon');await assert.rejects(merge(id(),[line(1)]),/permission denied/);
  await db.exec('RESET ROLE');await asUser('');await assert.rejects(merge(id(),[line(1)]),/Authentication required/);await db.exec('RESET ROLE');
 });
 await t.test('forced failure rolls back all lines and receipt',async()=>{
  await db.query('UPDATE products SET published=true WHERE id=$1',[product]);
  await db.exec(`CREATE FUNCTION public.fail_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced failure'; END $$; CREATE TRIGGER fail_test BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.fail_test();`);
  const request=id();await asUser(other);await assert.rejects(merge(request,[line(1)]),/forced failure/);
  await db.exec('RESET ROLE');assert.equal((await db.query('SELECT count(*)::integer n FROM app_private.cart_merge_receipts WHERE request_id=$1',[request])).rows[0].n,0);
 });
 } finally {await db.close();}
});
