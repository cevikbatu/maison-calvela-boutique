import {test} from 'node:test';import assert from 'node:assert/strict';
import {indexingSite,indexingHeaders,robotsText} from '../src/lib/indexing.ts';
import {registerHooks} from 'node:module';
test('indexing fails closed unless explicitly enabled on a production HTTPS origin',()=>{
 for(const flag of [undefined,'false','TRUE',true,''])assert.equal(indexingSite('https://calvela.com',flag),undefined);
 for(const site of ['https://staging.calvela.com','http://calvela.com','https://localhost','https://127.0.0.1','https://calvela.com/path','https://user@calvela.com','invalid'])assert.equal(indexingSite(site,'true'),undefined);
 assert.equal(indexingSite('https://CALVELA.com/','true'),'https://calvela.com');
});
test('disabled indexing sends noindex headers and robots disallow; enabled production retains SEO',()=>{
 const off=indexingSite('https://calvela.com','false');
 assert.equal(indexingHeaders(new Response('page'),off).headers.get('x-robots-tag'),'noindex, nofollow');
 assert.equal(robotsText(off),'User-agent: *\nDisallow: /\n');
 assert.match(robotsText(indexingSite('https://calvela.com','true')),/Sitemap: https:\/\/calvela.com\/sitemap.xml/);
 assert.equal(indexingHeaders(new Response('page'),'https://calvela.com').headers.get('x-robots-tag'),null);
});
test('actual page and product metadata omit production canonical while disabled and restore it when enabled',async()=>{
 const oldFetch=globalThis.fetch,oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_PUBLISHABLE_KEY;
 process.env.SUPABASE_URL='http://127.0.0.1:1';process.env.SUPABASE_PUBLISHABLE_KEY='local-test-placeholder';
 globalThis.fetch=async url=>new Response(JSON.stringify(new URL(url).pathname.endsWith('/products')?[{id:'fixture',title:'Fixture',description:'Fixture description',gender:'kadin',slug:'fixture'}]:[]),{headers:{'content-type':'application/json'}});
 try{for(const enabled of [false,true]){
  const site=enabled?'https://calvela.com':undefined;
  const hooks=registerHooks({resolve(s,c,next){
   if(s==='./indexing-config')return {url:'data:text/javascript,'+encodeURIComponent(`export const publicIndexingSite=${JSON.stringify(site)??'undefined'};`),shortCircuit:true};
   if(s==='@tanstack/react-start')return {url:'data:text/javascript,'+encodeURIComponent('export function createServerFn(){return {validator(){return this},handler(fn){return data=>fn({data})}}}'),shortCircuit:true};
   return next(s,c);
  }});
  try{
   const {pageMeta}=await import(`../src/lib/page-meta.ts?test=${enabled}`),{productMeta}=await import(`../src/lib/product-meta.ts?test=${enabled}`);
   const page=pageMeta('Fixture','Description','/fixture'),product=await productMeta('fixture');
   assert.equal(page.links?.[0]?.href,enabled?'https://calvela.com/fixture':undefined);
   assert.equal(product.head.links?.[0]?.href,enabled?'https://calvela.com/urun/fixture':undefined);
   assert.equal(product.head.meta[0].title,'Fixture | Maison Calvela');
  }finally{hooks.deregister();}
 }}finally{globalThis.fetch=oldFetch;if(oldUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.SUPABASE_PUBLISHABLE_KEY;else process.env.SUPABASE_PUBLISHABLE_KEY=oldKey;}
});
