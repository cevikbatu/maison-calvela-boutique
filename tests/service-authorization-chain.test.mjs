import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isolatedDatabase,apply,migrations,asActor} from './helpers/migration-chain.mjs';

test('actual migration chain: request, role and attachment authorization', {skip:!process.env.MC_PGLITE_MODULE}, async t=>{
 const db=await isolatedDatabase();
 const owner='10000000-0000-0000-0000-000000000001',other='10000000-0000-0000-0000-000000000002',admin='10000000-0000-0000-0000-000000000003';
 const request='40000000-0000-0000-0000-000000000001';
 try{
  await apply(db,migrations);
  for(const id of [owner,other,admin])await db.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[id,`${id}@example.invalid`]);
  await db.query("INSERT INTO user_roles(user_id,role) VALUES($1,'admin')",[admin]);
  const product=(await db.query('SELECT id FROM products LIMIT 1')).rows[0].id;
  const order=(await db.query('INSERT INTO orders(user_id) VALUES($1) RETURNING id',[owner])).rows[0].id;
  const item=(await db.query('INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES($1,$2,1,0) RETURNING id',[order,product])).rows[0].id;
  await asActor(db,owner);
  await db.query("SELECT create_service_request($1,$2,'exchange','fixture@example.invalid','Beden değişimi','')",[request,item]);
  await db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('service-request-photos',$1)",[`${request}/fixture.png`]);
  await t.test('owner sees own request; cannot modify decision, history or promote self',async()=>{
   assert.equal((await db.query('SELECT * FROM service_requests')).rows.length,1);
   for(const sql of ["UPDATE service_requests SET decision_reason='forged',status='approved'","UPDATE service_request_history SET description='forged'",`INSERT INTO user_roles(user_id,role) VALUES('${owner}','admin')`])await assert.rejects(db.exec(sql),/permission denied|row-level security/);
   await assert.rejects(db.query("SELECT decide_service_request($1,now(),'approved','')",[request]),/admin required/);
  });
  await t.test('other customer cannot read by id, forged owner filter, history or attachment',async()=>{
   await asActor(db,other);
   assert.equal((await db.query('SELECT * FROM service_requests WHERE id=$1 OR user_id=$2',[request,owner])).rows.length,0);
   assert.equal((await db.query('SELECT * FROM service_request_history')).rows.length,0);
   assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,0);
   await assert.rejects(db.query("SELECT create_service_request(gen_random_uuid(),$1,'return','fixture@example.invalid','','')",[item]),/not accessible/);
   await assert.rejects(db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('service-request-photos',$1)",[`${request}/forged.png`]),/row-level security/);
  });
  await t.test('anon cannot read private request or attachment',async()=>{
   await asActor(db,'','anon');
   await assert.rejects(db.query('SELECT * FROM service_requests'),/permission denied/);
   assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,0);
  });
  await t.test('actual admin role permits view and audited rejection with reason',async()=>{
   await asActor(db,admin);
   assert.equal((await db.query('SELECT * FROM storage.objects')).rows.length,1);
   const stamp=(await db.query('SELECT updated_at::text stamp FROM service_requests WHERE id=$1',[request])).rows[0].stamp;
   await db.query("SELECT decide_service_request($1,$2,'rejected','İstenen varyant mevcut değil.')",[request,stamp]);
   const history=(await db.query('SELECT * FROM service_request_history WHERE request_id=$1 ORDER BY created_at',[request])).rows;
   assert.equal(history.length,2);assert.equal(history[1].actor_id,admin);
   assert.equal(history[1].description,'İstenen varyant mevcut değil.');
  });
  await t.test('customer sees committed decision and its audit, cannot delete attachment',async()=>{
   await asActor(db,owner);
   const row=(await db.query('SELECT * FROM service_requests WHERE id=$1',[request])).rows[0];
   assert.equal(row.status,'rejected');assert.equal(row.decided_by,admin);assert.ok(row.decided_at);
   assert.equal(row.decision_reason,'İstenen varyant mevcut değil.');
   assert.equal((await db.query('SELECT * FROM service_request_history')).rows.length,2);
   assert.equal((await db.query('DELETE FROM storage.objects RETURNING id')).rows.length,0);
  });
 }finally{await db.close();}
});
