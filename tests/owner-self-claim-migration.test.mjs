import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const sql=readFileSync(new URL('../docs/drafts/secure-owner-self-claim.sql',import.meta.url),'utf8');

test('owner self-claim derives identity from auth.uid and fixes the allowed email server-side',()=>{
  assert.match(sql,/actor uuid := auth\.uid\(\)/);
  assert.match(sql,/cevikbatu11@gmail\.com/);
  assert.doesNotMatch(sql,/claim_first_owner\s*\([^)]*uuid/i);
  assert.doesNotMatch(sql,/claim_first_owner\s*\([^)]*text/i);
});

test('owner self-claim is authenticated-only and setup status exposes only a boolean',()=>{
  assert.match(sql,/GRANT EXECUTE ON FUNCTION public\.claim_first_owner\(\) TO authenticated/);
  assert.match(sql,/REVOKE ALL ON FUNCTION public\.claim_first_owner\(\) FROM PUBLIC, anon/);
  assert.match(sql,/RETURNS boolean[\s\S]*public\.owner_setup_available/);
});

const runtime=process.env.MC_PGLITE_MODULE;
test('owner claim authorization in isolated PostgreSQL',{skip:!runtime},async t=>{
 const {pathToFileURL}=await import('node:url');const {PGlite}=await import(pathToFileURL(runtime).href);const db=new PGlite();
 const owner='10000000-0000-0000-0000-000000000001',other='10000000-0000-0000-0000-000000000002';
 try {
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE SCHEMA app_private;
 CREATE TYPE public.app_role AS ENUM('admin','user');
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,email_confirmed_at timestamptz,is_anonymous boolean DEFAULT false);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.actor',true),'')::uuid $$;
 CREATE TABLE public.user_roles(user_id uuid REFERENCES auth.users(id),role public.app_role,UNIQUE(user_id,role));
 INSERT INTO auth.users(id,email) VALUES('${owner}','cevikbatu11@gmail.com'),('${other}','mock@example.invalid');`);
 await db.exec(sql);
 async function actor(id,role='authenticated'){await db.exec('RESET ROLE');await db.query("SELECT set_config('test.actor',$1,false)",[id]);await db.exec(`SET ROLE ${role}`);}
 const claim=async()=> (await db.query('SELECT public.claim_first_owner() ok')).rows[0].ok;
 await t.test('anonymous caller cannot claim',async()=>{await actor('','anon');await assert.rejects(claim(),/permission denied/);});
 await t.test('unverified owner cannot claim',async()=>{await actor(owner);assert.equal(await claim(),false);});
 await t.test('verified unrelated account cannot claim',async()=>{await db.exec('RESET ROLE');await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[other]);await actor(other);assert.equal(await claim(),false);});
 await t.test('verified owner succeeds and retry is idempotent',async()=>{await db.exec('RESET ROLE');await db.query('UPDATE auth.users SET email_confirmed_at=now() WHERE id=$1',[owner]);await actor(owner);assert.equal(await claim(),true);assert.equal(await claim(),true);await db.exec('RESET ROLE');assert.equal((await db.query('SELECT count(*)::integer n FROM user_roles')).rows[0].n,1);});
 await t.test('existing different admin closes initial setup',async()=>{await db.exec('RESET ROLE');await db.exec('DELETE FROM user_roles');await db.query("INSERT INTO user_roles VALUES($1,'admin')",[other]);await actor(owner);assert.equal(await claim(),false);});
 await t.test('anonymous setup check exposes Boolean only',async()=>{await actor('','anon');assert.equal((await db.query('SELECT public.owner_setup_available() available')).rows[0].available,false);});
 }finally{await db.close();}
});
