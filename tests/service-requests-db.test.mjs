import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {pathToFileURL} from 'node:url';
test('service request ownership, audit and decision guards in isolated PostgreSQL',{skip:!process.env.MC_PGLITE_MODULE},async t=>{
 const {PGlite}=await import(pathToFileURL(process.env.MC_PGLITE_MODULE).href);const db=new PGlite();
 const u='10000000-0000-0000-0000-000000000001',other='10000000-0000-0000-0000-000000000002',admin='10000000-0000-0000-0000-000000000003',order='20000000-0000-0000-0000-000000000001',item='30000000-0000-0000-0000-000000000001';let seq=0;
 const next=()=>`40000000-0000-0000-0000-${String(++seq).padStart(12,'0')}`;
 try{
  await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE SCHEMA app_private;CREATE SCHEMA storage;
   GRANT USAGE ON SCHEMA app_private,auth,storage TO authenticated;
   CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE TABLE profiles(id uuid PRIMARY KEY);
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.user',true),'')::uuid$$;
   CREATE FUNCTION app_private.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$SELECT $1='${admin}'::uuid AND $2='admin'$$;
   CREATE TABLE orders(id uuid PRIMARY KEY,user_id uuid NOT NULL);CREATE TABLE order_items(id uuid PRIMARY KEY,order_id uuid NOT NULL);
   CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
   CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text);ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;GRANT SELECT,INSERT ON storage.objects TO authenticated;
   INSERT INTO auth.users VALUES('${u}'),('${other}'),('${admin}');INSERT INTO profiles SELECT id FROM auth.users;
   INSERT INTO orders VALUES('${order}','${u}');INSERT INTO order_items VALUES('${item}','${order}');`);
  await db.exec(readFileSync(new URL('../supabase/migrations/20260930170543_customer_service_requests.sql',import.meta.url),'utf8'));
  async function actor(who){await db.exec('RESET ROLE');await db.query("SELECT set_config('test.user',$1,false)",[who]);await db.exec('SET ROLE authenticated');}
  const create=async(id,kind='return',reason='')=>(await db.query('SELECT create_service_request($1,$2,$3,$4,$5,$6) id',[id,item,kind,'test@example.invalid',reason,''])).rows[0].id;
  async function decide(id,status,reason=''){const row=(await db.query('SELECT updated_at::text stamp FROM service_requests WHERE id=$1',[id])).rows[0];return db.query('SELECT decide_service_request($1,$2,$3,$4)',[id,row.stamp,status,reason]);}
  const returned=next(),exchanged=next();
  await t.test('unknown delivery goes to review, return needs no reason and retries do not duplicate',async()=>{
   await actor(u);assert.equal(await create(returned),returned);assert.equal(await create(returned),returned);
   assert.equal((await db.query('SELECT status FROM service_requests')).rows[0].status,'reviewing');
   assert.equal((await db.query('SELECT * FROM service_request_history')).rows.length,1);
   await assert.rejects(create(returned,'exchange','Reason'),/conflict/);
  });
  await t.test('other customer cannot view request/history/photos or submit against this order',async()=>{
   await actor(other);assert.equal((await db.query('SELECT * FROM service_requests')).rows.length,0);
   assert.equal((await db.query('SELECT * FROM service_request_history')).rows.length,0);
   await assert.rejects(create(next()),/not accessible/);
   await assert.rejects(db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('service-request-photos',$1)",[returned+'/photo.webp']),/row-level security/);
  });
  await t.test('customer cannot forge status or admin decision; exchange reason required',async()=>{
   await actor(u);await assert.rejects(create(next(),'exchange'),/invalid/);
   await create(exchanged,'exchange','Beden değişimi');
   await assert.rejects(db.exec("UPDATE service_requests SET status='approved'"),/permission denied/);
   await assert.rejects(decide(returned,'approved'),/admin required/);
   await assert.rejects(db.query("INSERT INTO storage.objects(bucket_id,name) VALUES('service-request-photos',$1)",[returned+'/photo.webp']),/row-level security/);
  });
  await t.test('admin cannot reject statutory return and stale decisions fail; audit is appended',async()=>{
   await actor(admin);await assert.rejects(decide(returned,'rejected','Sebep makul değil'),/statutory/);
   await assert.rejects(decide(exchanged,'rejected',''),/statutory/);
   await decide(exchanged,'rejected','İstenen varyant stokta bulunmuyor.');
   await assert.rejects(decide(exchanged,'approved'),/closed/);
   const stamp=(await db.query('SELECT updated_at::text stamp FROM service_requests WHERE id=$1',[returned])).rows[0].stamp;
   await decide(returned,'processing');
   await assert.rejects(db.query("SELECT decide_service_request($1,$2,'completed','')",[returned,stamp]),/changed/);
   await decide(returned,'completed');
   assert.equal((await db.query('SELECT * FROM service_request_history WHERE request_id=$1',[returned])).rows.length,3);
  });
  await t.test('email queue is private and delivery disabled; photo bucket private',async()=>{
   await actor(u);await assert.rejects(db.exec('SELECT * FROM app_private.service_email_queue'),/permission denied/);
   await db.exec('RESET ROLE');assert.ok((await db.query('SELECT delivery_enabled FROM app_private.service_email_queue')).rows.every(r=>r.delivery_enabled===false));
   assert.equal((await db.query('SELECT public FROM storage.buckets')).rows[0].public,false);
  });
 }finally{await db.close();}
});
