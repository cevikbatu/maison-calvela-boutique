import 'react';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { cartQuantityError, cartStockWarning } from '../src/components/store/cart-stock.ts';

const product={id:'p',variants:[{id:'v',productId:'p',color:'Siyah',size:'S',inventory:5}]};
const item={productId:'p',color:'Siyah',size:'S',quantity:3};
const ready={loading:false,error:false};
const harness={slots:[],cursor:0,effects:[],catalog:{products:[product],...ready},signed:false,writes:[]};
globalThis.__cartTest=harness;
const virtual=source=>'data:text/javascript,'+encodeURIComponent(source);
const react=virtual(`import React from ${JSON.stringify(import.meta.resolve('react'))}; export const {createContext,useContext}=React;
export function useState(initial){const h=globalThis.__cartTest,i=h.cursor++;if(!(i in h.slots))h.slots[i]=initial;return [h.slots[i],v=>{h.slots[i]=typeof v==='function'?v(h.slots[i]):v}];}
export function useRef(initial){const h=globalThis.__cartTest,i=h.cursor++;return h.slots[i]??(h.slots[i]={current:initial});}
export function useEffect(fn,deps){const h=globalThis.__cartTest,i=h.cursor++,old=h.slots[i];if(!old||deps.some((v,n)=>v!==old[n])){h.slots[i]=deps;h.effects.push(fn);}}`);
const catalog=virtual('export function useCatalog(){return globalThis.__cartTest.catalog;}');
const client=virtual(`export const supabase={auth:{getUser:async()=>({data:{user:globalThis.__cartTest.signed?{id:'u'}:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from(table){
let action='select',payload;const q={select(){return q},eq(){return q},maybeSingle(){return q},single(){return q},update(v){action='update';payload=v;return q},insert(v){action='insert';payload=v;return q},delete(){action='delete';return q},then(resolve,reject){
const h=globalThis.__cartTest;if(action!=='select')h.writes.push({table,action,payload});
const data=action!=='select'?{id:'new'}:table==='favorites'?[]:table==='carts'?{id:'c'}:table==='product_variants'?[{id:'v',product_id:'p',color:'Siyah',size:'S'}]:table==='cart_items'?[{id:'ci',variant_id:'v',quantity:3}]:[];
return Promise.resolve({data,error:((action!=='select'&&h.failWrites)||(action==='select'&&h.failReads))?{message:'mock failure'}:null}).then(resolve,reject);}};return q;}};`);
const loader=virtual('export function loadCatalog(){return new Promise((resolve,reject)=>globalThis.__cartTest.requests.push({resolve,reject}));}');
const hooks=registerHooks({
 resolve(s,c,next){
  if(s==='./catalog-data')return {url:loader,shortCircuit:true};
  if(s==='./catalog-provider')return {url:catalog,shortCircuit:true};
  if(s==='@/integrations/supabase/client')return {url:client,shortCircuit:true};
  const u=s.startsWith('@/')?new URL('../src/'+s.slice(2),import.meta.url):s.startsWith('.')&&c.parentURL?.startsWith('file:')?new URL(s,c.parentURL):null;
  if(u)for(const suffix of ['', '.ts','.tsx'])if(existsSync(new URL(u.href+suffix)))return next(u.href+suffix,c);
  return next(s,c);
 },
 load(url,c,next){
  if(/\.tsx?$/.test(url))return {format:'module',shortCircuit:true,source:'import React from "react";'+ts.transpileModule(readFileSync(fileURLToPath(url),'utf8').replace("from 'react'",'from '+JSON.stringify(react)),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.React}}).outputText};
  return next(url,c);
 }
});
const {StoreProvider}=await import('../src/components/store/store-provider.tsx');
const {CatalogProvider}=await import('../src/components/store/catalog-provider.tsx');
hooks.deregister();
function render(){harness.cursor=0;const value=StoreProvider({children:null}).props.value;for(const effect of harness.effects.splice(0))effect();return value;}
async function settle(){for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));return render();}
async function setup(signed){
 Object.assign(harness,{slots:[],cursor:0,effects:[],signed,writes:[],catalog:{products:[structuredClone(product)],...ready}});
 const storage=new Map(signed?[]:[['mc-cart',JSON.stringify([item])]]);
 globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 render();return settle();
}
for(const signed of [false,true]){
 const label=signed?'account':'guest';
 test(`${label}: 3 + 3 rejected without state or persistence changes`,async()=>{
  const api=await setup(signed);assert.match(api.addToCart('p','S','Siyah',3),/yeterli stok/);
  assert.deepEqual((await settle()).cart,[item]);assert.deepEqual(harness.writes,[]);
 });
 test(`${label}: 3 + 2 accepted; immediate additional call cannot use stale total`,async()=>{
  const api=await setup(signed);assert.equal(api.addToCart('p','S','Siyah',2),null);
  assert.match(api.addToCart('p','S','Siyah'),/yeterli stok/);
  assert.equal((await settle()).cart[0].quantity,5);
  assert.equal(harness.writes.length,signed?1:0);
  if(signed)assert.equal(harness.writes[0].payload.quantity,5);
 });
 test(`${label}: loading/error/zero/missing stock blocks increases but allows decrease and removal`,async()=>{
  for(const mode of ['loading','error','zero','missing']){
   await setup(signed);
   if(mode==='loading'||mode==='error')harness.catalog[mode]=true;
   else harness.catalog.products[0].variants=mode==='missing'?[]:[{...product.variants[0],inventory:0}];
   const api=render();assert.ok(api.addToCart('p','S','Siyah'));assert.ok(api.updateQuantity('p','S','Siyah',4));
   assert.deepEqual((await settle()).cart,[item]);assert.deepEqual(harness.writes,[]);
   assert.equal(api.updateQuantity('p','S','Siyah',2),null);assert.equal((await settle()).cart[0].quantity,2);
   api.removeFromCart('p','S','Siyah');assert.deepEqual((await settle()).cart,[]);
   if(signed)assert.deepEqual(harness.writes.map(v=>v.action),['update','delete']);
  }
 });
 test(`${label}: refresh preserves excess cart and recovery uses new inventory`,async()=>{
  await setup(signed);harness.catalog.products[0].variants[0].inventory=2;
  let api=render();assert.equal(api.cart[0].quantity,3);assert.equal(cartStockWarning(harness.catalog.products[0],api.cart[0],ready),'Bu ürünün mevcut stoğu değişti.');
  assert.ok(api.updateQuantity('p','S','Siyah',4));
  harness.catalog.products[0].variants[0].inventory=5;api=render();assert.equal(api.updateQuantity('p','S','Siyah',5),null);
  assert.equal((await settle()).cart[0].quantity,5);
 });
 test(`${label}: quantity validation retains 99 cap`,async()=>{
  const api=await setup(signed);harness.catalog.products[0].variants[0].inventory=1000;
  for(const q of [0,-1,1.5,NaN,Infinity,100])assert.ok(api.updateQuantity('p','S','Siyah',q));
  assert.equal(api.updateQuantity('p','S','Siyah',99),null);assert.ok(api.addToCart('p','S','Siyah'));
  assert.equal((await settle()).cart[0].quantity,99);
 });
}
test('variant identity uses exact product, color and size',()=>{
 for(const changed of [{productId:'other'},{color:'siyah'},{size:'M'}])assert.ok(cartQuantityError(changed.productId?undefined:product,{...item,...changed},ready));
 assert.equal(cartQuantityError(product,{...item,quantity:5},ready),null);
});
test('warnings distinguish changed stock from unverifiable stock and clear on recovery',()=>{
 assert.equal(cartStockWarning(product,item,ready),null);
 assert.match(cartStockWarning(product,item,{...ready,error:true}),/doğrulanamıyor/);
 assert.match(cartStockWarning(product,item,{...ready,loading:true}),/doğrulanıyor/);
 assert.match(cartStockWarning({...product,variants:[]},item,ready),/mevcut değil/);
 assert.equal(cartStockWarning({...product,variants:[{...product.variants[0],inventory:0}]},item,ready),'Bu ürünün mevcut stoğu değişti.');
});

test('legacy quantity can decrease 101 -> 100 -> 99 but cannot increase',async()=>{
 await setup(false);harness.slots[1]=[{...item,quantity:101}];
 harness.slots.find(v=>v&&Array.isArray(v.current)).current=harness.slots[1];
 const api=render();assert.equal(api.updateQuantity('p','S','Siyah',100),null);
 assert.equal(api.updateQuantity('p','S','Siyah',99),null);
 assert.ok(api.updateQuantity('p','S','Siyah',100));assert.equal((await settle()).cart[0].quantity,99);
});
test('failed account write restores server cart and cancels queued stale edits',async()=>{
 const api=await setup(true);harness.failWrites=true;
 try {
  api.updateQuantity('p','S','Siyah',2);api.removeFromCart('p','S','Siyah');
  const restored=await settle();assert.equal(restored.cart[0].quantity,3);
  assert.match(restored.syncError,/Sunucudaki sepet geri yüklendi/);
  assert.equal(harness.writes.length,1);
 } finally {harness.failWrites=false;}
});
test('catalog ignores older success while newer request is still loading',async()=>{
 Object.assign(harness,{slots:[],cursor:0,effects:[],requests:[]});
 function view(){harness.cursor=0;return CatalogProvider({children:null}).props.value;}
 const api=view();harness.effects=[];
 const old=api.reload(),latest=api.reload();
 harness.requests[0].resolve([{id:'old'}]);await old;
 assert.equal(view().loading,true);assert.deepEqual(view().products,[]);
 harness.requests[1].resolve([{id:'new'}]);await latest;
 assert.equal(view().loading,false);assert.equal(view().products[0].id,'new');
});
test('catalog late older success cannot overwrite newer stock',async()=>{
 Object.assign(harness,{slots:[],cursor:0,effects:[],requests:[]});
 function view(){harness.cursor=0;return CatalogProvider({children:null}).props.value;}
 const api=view();harness.effects=[];
 const old=api.reload(),latest=api.reload();
 harness.requests[1].resolve([{id:'new',inventory:0}]);await latest;
 harness.requests[0].resolve([{id:'old',inventory:5}]);await old;
 assert.equal(view().products[0].id,'new');assert.equal(view().products[0].inventory,0);
});
test('failed reconciliation blocks new changes until reload',async()=>{
 const api=await setup(true);harness.failWrites=true;harness.failReads=true;
 try {
  api.updateQuantity('p','S','Siyah',2);const blocked=await settle();
  assert.match(blocked.syncError,/Sepet doğrulanamadı/);
  assert.ok(blocked.addToCart('p','S','Siyah'));assert.ok(blocked.updateQuantity('p','S','Siyah',1));
  blocked.removeFromCart('p','S','Siyah');assert.equal((await settle()).cart[0].quantity,2);
  assert.equal(harness.writes.length,1);
 } finally {harness.failWrites=false;harness.failReads=false;}
});
test('successful retry after reconciliation uses restored amount',async()=>{
 let api=await setup(true);harness.failWrites=true;
 api.updateQuantity('p','S','Siyah',2);api=await settle();harness.failWrites=false;
 assert.equal(api.cart[0].quantity,3);assert.ok(api.addToCart('p','S','Siyah',3));
 assert.equal(api.addToCart('p','S','Siyah',2),null);assert.equal((await settle()).cart[0].quantity,5);
});
test('rapid successful decrease increase remove is persisted in order',async()=>{
 const api=await setup(true);api.updateQuantity('p','S','Siyah',2);api.addToCart('p','S','Siyah',3);api.removeFromCart('p','S','Siyah');
 assert.deepEqual((await settle()).cart,[]);
 assert.deepEqual(harness.writes.map(v=>[v.action,v.payload?.quantity]),[['update',2],['update',5],['delete',undefined]]);
});