import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import sharp from 'sharp';
// Operator supplies LOCAL disposable fixture accounts. No .env loading and no production host permitted.
const enabled=process.env.MC_LOCAL_HTTP_TEST==='yes';
test('real local Supabase Auth/PostgREST/Storage and upload endpoint',{skip:!enabled},async t=>{
 const required=['MC_HTTP_URL','MC_PHOTO_URL','MC_HTTP_ANON_KEY','MC_OWNER_JWT','MC_OTHER_JWT','MC_ADMIN_JWT','MC_REQUEST_ID'];
 for(const name of required)assert.ok(process.env[name],`${name} required`);
 const base=new URL(process.env.MC_HTTP_URL),photos=new URL(process.env.MC_PHOTO_URL);
 for(const url of [base,photos])assert.ok(['127.0.0.1','localhost'].includes(url.hostname)&&url.protocol==='http:'&&!url.username&&!url.password,'Disposable loopback only; no tunnels');
 const requestId=process.env.MC_REQUEST_ID;assert.match(requestId,/^[a-f0-9-]{36}$/i);
 const owner=process.env.MC_OWNER_JWT,other=process.env.MC_OTHER_JWT,admin=process.env.MC_ADMIN_JWT;
 const api=(path,token,init={})=>fetch(new URL(path,base),{...init,headers:{apikey:process.env.MC_HTTP_ANON_KEY,...(token?{Authorization:`Bearer ${token}`}:{ }),'content-type':'application/json',...init.headers},signal:AbortSignal.timeout(10_000)});
 await t.test('verified JWT owner/admin see fixture; other and anon cannot',async()=>{
  for(const token of [owner,other,admin])assert.equal((await api('/auth/v1/user',token)).status,200);
  for(const token of [owner,admin]){const r=await api(`/rest/v1/service_requests?id=eq.${requestId}&select=id`,token);assert.equal(r.status,200);assert.equal((await r.json()).length,1);}
  const denied=await api(`/rest/v1/service_requests?id=eq.${requestId}&select=id`,other);assert.equal(denied.status,200);assert.deepEqual(await denied.json(),[]);
  assert.ok([401,403].includes((await api(`/rest/v1/service_requests?id=eq.${requestId}`,null)).status));
 });
 const uploadId=randomUUID(),path=`${requestId}/${uploadId}.webp`;
 const bytes=await sharp({create:{width:3,height:3,channels:3,background:'white'}}).png().toBuffer();
 const upload=token=>fetch(new URL(`/api/request-photos/${requestId}/${uploadId}`,photos),{method:'POST',headers:{...(token?{Authorization:`Bearer ${token}`}:{ }),'content-type':'image/png','x-photo-name':'fixture.png'},body:bytes,signal:AbortSignal.timeout(20_000)});
 await t.test('upload endpoint rejects other/anon and accepts owner idempotently',async()=>{
  assert.equal((await upload(other)).status,403);assert.equal((await upload(null)).status,401);
  assert.equal((await upload(owner)).status,200);assert.equal((await upload(owner)).status,200);
 });
 await t.test('direct Storage write forbidden even for owner',async()=>{
  const r=await api(`/storage/v1/object/service-request-photos/${requestId}/${randomUUID()}.webp`,owner,{method:'POST',headers:{'content-type':'image/webp'},body:bytes});assert.ok(r.status>=400);
 });
 await t.test('private download and signed URL are limited to owner/admin',async()=>{
  for(const token of [owner,admin])assert.equal((await api(`/storage/v1/object/authenticated/service-request-photos/${path}`,token)).status,200);
  for(const token of [other,null])assert.ok((await api(`/storage/v1/object/authenticated/service-request-photos/${path}`,token)).status>=400);
  assert.ok((await api(`/storage/v1/object/sign/service-request-photos/${path}`,other,{method:'POST',body:JSON.stringify({expiresIn:5})})).status>=400);
  const r=await api(`/storage/v1/object/sign/service-request-photos/${path}`,owner,{method:'POST',body:JSON.stringify({expiresIn:1})});assert.equal(r.status,200);
  const body=await r.json();assert.equal(typeof body.signedURL,'string');
  const signed=new URL('/storage/v1'+body.signedURL,base);assert.equal(signed.origin,base.origin);
  assert.equal((await fetch(signed,{cache:'no-store'})).status,200);await new Promise(r=>setTimeout(r,2100));
  assert.ok((await fetch(signed,{cache:'no-store'})).status>=400);
  assert.ok((await api(`/storage/v1/object/authenticated/service-request-photos/${randomUUID()}/${uploadId}.webp`,other)).status>=400);
 });
 // Fixtures are intentionally retained in the DISPOSABLE stack; operator tears down that stack.
});
