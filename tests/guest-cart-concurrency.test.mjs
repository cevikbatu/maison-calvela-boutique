import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {randomUUID} from 'node:crypto';
import {migrations,platformSql} from './helpers/migration-chain.mjs';

// Opt-in only: an EMPTY disposable LOCAL PostgreSQL cluster, never Supabase production.
const enabled=process.env.MC_DISPOSABLE_PG==='yes'&&process.env.MC_PG_URL&&process.env.MC_PG_MODULE;
test('real PostgreSQL: independent connections serialize concurrent guest merges',{skip:!enabled},async t=>{
 const url=new URL(process.env.MC_PG_URL);
 assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname),'Local database only');
 assert.match(url.pathname,/^\/mc_test_[a-z0-9_]+$/,'Disposable test database name required');
 for(const key of url.searchParams.keys())assert.equal(key,'sslmode','Connection overrides forbidden');
 const {Client}=await import(pathToFileURL(process.env.MC_PG_MODULE).href);
 const connections=[];
 async function connect(){const c=new Client({connectionString:url.href,connectionTimeoutMillis:5000});await c.connect();connections.push(c);await c.query("SET statement_timeout='10s'");return c;}
 try{
  const setup=await connect();
  assert.equal((await setup.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rows[0].n,0,'Database must be empty');
  assert.equal((await setup.query("SELECT count(*)::int n FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')")).rows[0].n,0,'Use a separate disposable cluster');
  await setup.query(platformSql);
  for(const name of migrations)await setup.query(`BEGIN;${readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8')}COMMIT;`);
  const user=randomUUID();await setup.query('INSERT INTO auth.users(id,email) VALUES($1,$2)',[user,'fixture@example.invalid']);
  const v=(await setup.query('SELECT * FROM product_variants LIMIT 1')).rows[0];
  await setup.query('UPDATE product_variants SET inventory=5 WHERE id=$1',[v.id]);
  await setup.query('INSERT INTO carts(user_id) VALUES($1)',[user]);
  const a=await connect(),b=await connect();
  for(const c of [a,b]){await c.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user]);await c.query('SET ROLE authenticated');}
  const merge=async(c,id,n)=>(await c.query('SELECT merge_guest_cart($1,$2::jsonb,$3) result',[id,JSON.stringify([{productId:v.product_id,color:v.color,size:v.size,quantity:n}]),user])).rows[0].result;
  const quantity=async()=>(await setup.query('SELECT quantity FROM cart_items WHERE variant_id=$1',[v.id])).rows[0]?.quantity??0;
  async function overlap(id1,id2){
   await setup.query('BEGIN');await setup.query('SELECT id FROM carts WHERE user_id=$1 FOR UPDATE',[user]);
   const jobs=Promise.all([merge(a,id1,3),merge(b,id2,3)]);jobs.catch(()=>{});
   try{
    let waiting=0;
    for(let i=0;i<100;i++){
     await setup.query('SELECT pg_stat_clear_snapshot()');
     waiting=(await setup.query("SELECT count(*)::int n FROM pg_stat_activity WHERE pid=ANY($1::int[]) AND wait_event_type='Lock'",[[a.processID,b.processID]])).rows[0].n;
     if(waiting===2)break;await new Promise(resolve=>setTimeout(resolve,25));
    }
    assert.equal(waiting,2,'Both independent requests must overlap while blocked');
   }finally{await setup.query('COMMIT');}
   return jobs;
  }
  await t.test('same request concurrently replays one receipt',async()=>{
   const id=randomUUID(),[first,second]=await overlap(id,id);assert.deepEqual(first,second);assert.equal(await quantity(),3);
  });
  await t.test('different requests compete for remaining stock; no quantity is lost',async()=>{
   const results=await overlap(randomUUID(),randomUUID());
   assert.equal(results.flat().reduce((sum,r)=>sum+r.accepted,0),2);
   assert.equal(results.flat().reduce((sum,r)=>sum+r.remaining,0),4);assert.equal(await quantity(),5);
  });
  await t.test('lost response replay and maximum 99',async()=>{
   await setup.query('UPDATE product_variants SET inventory=200 WHERE id=$1',[v.id]);
   const id=randomUUID();const first=await merge(a,id,200);
   assert.equal(first[0].accepted,94);assert.equal(first[0].remaining,106);
   assert.deepEqual(await merge(b,id,200),first);assert.equal(await quantity(),99);
  });
  await t.test('rollback removes receipt and quantity, same request can retry',async()=>{
   await setup.query('UPDATE cart_items SET quantity=1 WHERE variant_id=$1',[v.id]);
   const id=randomUUID();await a.query('BEGIN');await merge(a,id,2);await a.query('ROLLBACK');
   assert.equal(await quantity(),1);
   assert.equal((await setup.query('SELECT count(*)::int n FROM app_private.cart_merge_receipts WHERE request_id=$1',[id])).rows[0].n,0);
   assert.equal((await merge(b,id,2))[0].accepted,2);assert.equal(await quantity(),3);
  });
 }finally{await Promise.allSettled(connections.map(c=>c.end()));}
});
