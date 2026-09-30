import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {isolatedDatabase,apply,migrations,asActor} from './helpers/migration-chain.mjs';
test('actual migrations: guarded normal cart writes and server attachment slots',{skip:!process.env.MC_PGLITE_MODULE},async t=>{
 const db=await isolatedDatabase(),user=randomUUID(),other=randomUUID();
 try{
  await apply(db,migrations);
  for(const id of [user,other])await db.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[id,'fixture@example.invalid']);
  const v=(await db.query('SELECT * FROM product_variants LIMIT 1')).rows[0];await db.query('UPDATE product_variants SET inventory=5 WHERE id=$1',[v.id]);
  const order=(await db.query('INSERT INTO orders(user_id) VALUES($1) RETURNING id',[user])).rows[0].id;
  const item=(await db.query('INSERT INTO order_items(order_id,product_id,quantity,unit_price) VALUES($1,$2,1,0) RETURNING id',[order,v.product_id])).rows[0].id;
  const request=randomUUID();await asActor(db,user);await db.query("SELECT create_service_request($1,$2,'return','fixture@example.invalid','','')",[request,item]);
  const set=(expected,quantity,who=user)=>db.query('SELECT set_cart_quantity($1,$2,$3,$4)',[v.id,expected,quantity,who]);
  await t.test('direct writes are denied and normal RPC applies inventory/99/ownership guards',async()=>{
   await assert.rejects(db.query('UPDATE cart_items SET quantity=99'),/permission denied/);
   await set(0,3);await assert.rejects(set(3,6),/Stock/);await assert.rejects(set(3,100),/Invalid/);await assert.rejects(set(3,4,other),/Account/);
  });
  await t.test('merge followed by stale normal write preserves accepted quantities',async()=>{
   await db.query('SELECT merge_guest_cart($1,$2::jsonb,$3)',[randomUUID(),JSON.stringify([{productId:v.product_id,color:v.color,size:v.size,quantity:3}]),user]);
   await assert.rejects(set(3,4),/Cart changed/);assert.equal((await db.query('SELECT quantity FROM cart_items')).rows[0].quantity,5);
  });
  await t.test('unavailable inventory still permits decrease and removal',async()=>{
   await db.exec('RESET ROLE');await db.query('UPDATE product_variants SET inventory=0 WHERE id=$1',[v.id]);await asActor(db,user);
   await set(5,2);await set(2,0);assert.equal((await db.query('SELECT * FROM cart_items')).rows.length,0);
  });
  const hash='b'.repeat(64),upload=randomUUID();
  const reserve=(id,who=user,content=hash)=>db.query('SELECT reserve_request_photo($1,$2,$3,$4) result',[who,request,id,content]);
  await t.test('client cannot reserve/complete slots or bypass direct Storage ban',async()=>{
   await assert.rejects(reserve(upload),/permission denied/);
   await assert.rejects(db.query('SELECT complete_request_photo($1,$2,$3,$4)',[user,request,upload,hash]),/permission denied/);
   await assert.rejects(db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('service-request-photos',$1)",[`${request}/${upload}.webp`]),/row-level security/);
  });
  await t.test('server quota is three; replay reuses slot; mismatched content and owner rejected',async()=>{
   await asActor(db,'','service_role');const first=(await reserve(upload)).rows[0].result;
   assert.deepEqual((await reserve(upload)).rows[0].result,first);
   await assert.rejects(reserve(upload,user,'c'.repeat(64)),/conflict/);await assert.rejects(reserve(randomUUID(),other),/unavailable/);
   await reserve(randomUUID());await reserve(randomUUID());assert.equal((await reserve(randomUUID())).rows[0].result,null);
   await db.query('SELECT complete_request_photo($1,$2,$3,$4)',[user,request,upload,hash]);
   assert.equal((await reserve(upload)).rows[0].result.complete,true);
  });
 }finally{await db.close();}
});
