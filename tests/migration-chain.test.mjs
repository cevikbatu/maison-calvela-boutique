import {test} from 'node:test';import assert from 'node:assert/strict';
import {isolatedDatabase,apply,legacy,pending,migrations,asActor} from './helpers/migration-chain.mjs';
const options={skip:!process.env.MC_PGLITE_MODULE};
test('clean install: every repository migration executes in order on PGlite platform fixture',options,async()=>{
 const db=await isolatedDatabase();try{
  await apply(db,migrations);
  assert.equal((await db.query('SELECT count(*)::int n FROM products')).rows[0].n,12);
  assert.equal((await db.query('SELECT count(*)::int n FROM product_variants')).rows[0].n,120);
  for(const name of ['default_addresses','service_requests','service_request_history']){
   assert.equal((await db.query('SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass',[`public.${name}`])).rows[0].relrowsecurity,true);
  }
  await asActor(db,'','anon');await assert.rejects(db.query('SELECT * FROM service_requests'),/permission denied/);
  assert.equal((await db.query('SELECT count(*)::int n FROM product_prices')).rows[0].n,12);
 }finally{await db.close();}
});
test('upgrade: all legacy migrations then pending chain preserve existing product variant and customer data',options,async()=>{
 const db=await isolatedDatabase();try{
  await apply(db,legacy);
  const user='10000000-0000-0000-0000-000000000001';
  await db.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[user,'fixture@example.invalid']);
  const variant=(await db.query('SELECT * FROM product_variants ORDER BY id LIMIT 1')).rows[0];
  await db.query('UPDATE product_variants SET inventory=8,sku=$1 WHERE id=$2',['FIXTURE-SKU',variant.id]);
  const address=(await db.query("INSERT INTO addresses(user_id,recipient,line1,city,district) VALUES($1,'Fixture','Fixture address','Fixture city','Fixture district') RETURNING *",[user])).rows[0];
  const before=(await db.query('SELECT id,product_id,color,size,inventory,sku,updated_at FROM product_variants ORDER BY id')).rows;
  await apply(db,pending);
  assert.deepEqual((await db.query('SELECT id,product_id,color,size,inventory,sku,updated_at FROM product_variants ORDER BY id')).rows,before);
  assert.deepEqual((await db.query('SELECT * FROM addresses WHERE id=$1',[address.id])).rows[0],address);
  assert.equal((await db.query('SELECT count(*)::int n FROM user_roles')).rows[0].n,0);
  await asActor(db,user);await db.query('INSERT INTO default_addresses(user_id,address_id) VALUES($1,$2)',[user,address.id]);
  assert.equal((await db.query('UPDATE product_variants SET inventory=99 RETURNING id')).rows.length,0);
 }finally{await db.close();}
});
