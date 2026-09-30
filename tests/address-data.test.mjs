import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAddress,saveAddress,removeAddress} from '../src/components/store/address-data.ts';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const draft={label:'Ev',recipient:' Test ',line1:' Sokak ',line2:'',district:'İlçe',city:'İl',postal_code:'34000'};
test('address trims fields, requires nonblank address and validates postal code',()=>{
 assert.equal(validateAddress(draft).recipient,'Test');
 for(const key of ['recipient','line1','district','city'])assert.throws(()=>validateAddress({...draft,[key]:' '}));
 for(const postal_code of ['123','abcde','123456'])assert.throws(()=>validateAddress({...draft,postal_code}));
 assert.doesNotThrow(()=>validateAddress({...draft,postal_code:''}));
 assert.throws(()=>validateAddress({...draft,line1:'x'.repeat(301)}));
});
function mock(result){const calls=[];const chain={};for(const method of ['update','insert','delete','eq','select'])chain[method]=(...args)=>{calls.push([method,...args]);return chain;};chain.single=async()=>result;return {calls,from:()=>chain};}
test('address edits and deletes always filter by current owner and fail if no row returned',async()=>{
 const client=mock({data:{id:'a'},error:null});await saveAddress(client,'u','a',draft);
 assert.ok(client.calls.some(c=>c[0]==='eq'&&c[1]==='user_id'&&c[2]==='u'));
 const deletion=mock({data:{id:'a'},error:null});await removeAddress(deletion,'u','a');
 assert.ok(deletion.calls.some(c=>c[0]==='eq'&&c[1]==='user_id'&&c[2]==='u'));
 await assert.rejects(removeAddress(mock({data:null,error:null}),'u','a'));
 await assert.rejects(saveAddress(mock({data:null,error:{message:'private error'}}),'u',null,draft),/Adres kaydedilemedi/);
 await assert.rejects(saveAddress(client,'',null,draft));
});
test('address and default ownership policies in isolated PostgreSQL',{skip:!process.env.MC_PGLITE_MODULE},async t=>{
 const {PGlite}=await import(pathToFileURL(process.env.MC_PGLITE_MODULE).href);const db=new PGlite();
 const u='10000000-0000-0000-0000-000000000001',v='10000000-0000-0000-0000-000000000002',a='20000000-0000-0000-0000-000000000001',b='20000000-0000-0000-0000-000000000002';
 try{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.user',true),'')::uuid$$;
   CREATE TABLE profiles(id uuid PRIMARY KEY);CREATE TABLE products(id uuid);
   CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.updated_at=now();RETURN NEW;END$$;
   INSERT INTO profiles VALUES('${u}'),('${v}');`);
  await db.exec(readFileSync(new URL('../supabase/migrations/20260923121006_0e49b539-a1bd-4d18-8cbb-e847a3adc740.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../supabase/migrations/20260930170024_customer_default_address.sql',import.meta.url),'utf8'));
  await db.exec(`INSERT INTO addresses(id,user_id) VALUES('${a}','${u}'),('${b}','${v}');SELECT set_config('test.user','${u}',false);SET ROLE authenticated;`);
  await t.test('customer reads only own address and cannot edit/delete other owner',async()=>{
   assert.deepEqual((await db.query('SELECT id FROM addresses')).rows,[{id:a}]);
   assert.equal((await db.query(`UPDATE addresses SET label='bad' WHERE id='${b}' RETURNING id`)).rows.length,0);
   assert.equal((await db.query(`DELETE FROM addresses WHERE id='${b}' RETURNING id`)).rows.length,0);
   await assert.rejects(db.exec(`INSERT INTO addresses(user_id) VALUES('${v}')`),/row-level security/);
  });
  await t.test('default belongs to customer, upsert has one row, delete clears selection',async()=>{
   await assert.rejects(db.exec(`INSERT INTO default_addresses VALUES('${u}','${b}')`),/foreign key/);
   await db.exec(`INSERT INTO default_addresses VALUES('${u}','${a}') ON CONFLICT(user_id) DO UPDATE SET address_id=excluded.address_id;`);
   await db.exec(`INSERT INTO default_addresses VALUES('${u}','${a}') ON CONFLICT(user_id) DO UPDATE SET address_id=excluded.address_id;`);
   assert.equal((await db.query('SELECT * FROM default_addresses')).rows.length,1);
   await db.exec(`DELETE FROM addresses WHERE id='${a}'`);assert.equal((await db.query('SELECT * FROM default_addresses')).rows.length,0);
  });
  await t.test('anonymous has no access to private defaults',async()=>{await db.exec('RESET ROLE;SET ROLE anon');await assert.rejects(db.exec('SELECT * FROM default_addresses'),/permission denied/);});
 }finally{await db.close();}
});
