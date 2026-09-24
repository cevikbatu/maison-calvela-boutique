import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getSizeAvailability, retainAvailableSize, stockSelectionError } from '../src/components/store/stock-selection.ts';

const product={id:'p',name:'Mock Polo',sizes:['S','M','L'],colors:[{name:'Siyah',token:'black'},{name:'Beyaz',token:'ivory'}],variants:[
{id:'black-s',productId:'p',color:'Siyah',size:'S',inventory:5,sku:null,updatedAt:'now'},
{id:'black-m',productId:'p',color:'Siyah',size:'M',inventory:0,sku:null,updatedAt:'now'},
{id:'white-s',productId:'p',color:'Beyaz',size:'S',inventory:0,sku:null,updatedAt:'now'},
]};
const virtual='data:text/javascript,'+encodeURIComponent('export const state='+JSON.stringify({products:[product],loading:false,error:false})+';export function useCatalog(){return state;}');
const blockedClient='data:text/javascript,'+encodeURIComponent('export const supabase={from(){throw new Error("Unexpected database access")}};');

const reactUrl=import.meta.resolve('react');
const instrumentedReact='data:text/javascript,'+encodeURIComponent('import React from '+JSON.stringify(reactUrl)+';export * from '+JSON.stringify(reactUrl)+';export const updates=[];export function useState(initial){const [value,set]=React.useState(initial);return [value,next=>{updates.push(next);set(next)}];}');
const hooks=registerHooks({
 resolve(specifier,context,next){
   if(specifier.endsWith('/catalog-provider')||specifier==='./catalog-provider')return {url:virtual,shortCircuit:true};
   if(specifier==='@/integrations/supabase/client')return {url:blockedClient,shortCircuit:true};
   let url=specifier.startsWith('@/')?new URL('../src/'+specifier.slice(2),import.meta.url):specifier.startsWith('.')&&context.parentURL?.startsWith('file:')?new URL(specifier,context.parentURL):null;
   if(url){for(const suffix of ['', '.ts','.tsx']){const candidate=new URL(url.href+suffix);if(existsSync(candidate))return next(candidate.href,context);}}
   return next(specifier,context);
 },
 load(url,context,next){
   if(url.endsWith('.ts')||url.endsWith('.tsx'))return {format:'module',shortCircuit:true,source:'import __testReact from '+JSON.stringify('react')+';'+ts.transpileModule(readFileSync(fileURLToPath(url),'utf8').replace(url.endsWith('/store-provider.tsx') ? "from 'react'" : '__no_match__', 'from '+JSON.stringify(instrumentedReact)),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.React,jsxFactory:'__testReact.createElement',jsxFragmentFactory:'__testReact.Fragment'}}).outputText};
   return next(url,context);
 }
});
const {StockSizeOptions}=await import('../src/components/store/stock-size-options.tsx');
const {StoreProvider,useStore}=await import('../src/components/store/store-provider.tsx');
const {state}=await import(virtual);
const {updates}=await import(instrumentedReact);
hooks.deregister();
function store(){let api;function Probe(){api=useStore();return null;}renderToStaticMarkup(React.createElement(StoreProvider,null,React.createElement(Probe)));return api;}
test('A: positive inventory size selectable',()=>assert.equal(getSizeAvailability(product,'Siyah','S').available,true));
test('A: zero inventory size sold out',()=>assert.deepEqual([getSizeAvailability(product,'Siyah','M').available,getSizeAvailability(product,'Siyah','M').label],[false,'Tükendi']));
test('B: color change clears newly unavailable size',()=>assert.equal(retainAvailableSize(product,'Beyaz','S'),null));
test('color change preserves size if new variant has stock',()=>assert.equal(retainAvailableSize({...product,variants:[...product.variants,{...product.variants[0],id:'white-s',color:'Beyaz',inventory:2}].filter(v=>v.id!=='white-s'||v.inventory===2)},'Beyaz','S'),'S'));
test('C: missing combination unavailable, never unlimited',()=>assert.equal(getSizeAvailability(product,'Siyah','L').available,false));
test('missing combination has distinct explanatory message',()=>assert.match(stockSelectionError(product,'Siyah','L'),/stok bilgisi mevcut değil/));
test('exact matching: no color normalization',()=>assert.equal(getSizeAvailability(product,'siyah','S').available,false));
test('no size selected is rejected',()=>assert.match(stockSelectionError(product,'Siyah',null),/beden seçin/));
test('refresh to zero clears previous selection',()=>assert.equal(retainAvailableSize({...product,variants:product.variants.map(v=>({...v,inventory:0}))},'Siyah','S'),null));
test('invalid numeric stock is not purchasable',()=>{for(const inventory of [null,NaN,Infinity,-1,1.5])assert.equal(getSizeAvailability({...product,variants:[{...product.variants[0],inventory}]},'Siyah','S').available,false);});
test('shared size UI exposes disabled and text state for screen readers',()=>{
 const html=renderToStaticMarkup(React.createElement(StockSizeOptions,{product,color:'Siyah',size:null,onSelect(){},catalog:{loading:false,error:false},onRetry:async()=>{}}));
 assert.match(html,/disabled=""[^>]*aria-label="M — Tükendi"/);
 assert.match(html,/disabled=""[^>]*aria-label="L — Stok bilgisi yok"/);
 assert.match(html,/aria-label="S"/);
 assert.match(html,/>Tükendi<\/span>/);
 assert.match(html,/flex-wrap/);
});
test('D: actual addToCart rejects forced zero selection',()=>assert.match(store().addToCart('p','M','Siyah'),/tükenmiş/));
test('actual addToCart rejects missing variant',()=>assert.match(store().addToCart('p','L','Siyah'),/stok bilgisi/));
test('actual addToCart rejects unknown product',()=>assert.match(store().addToCart('missing','S','Siyah'),/Stok bilgisi/));
test('actual addToCart blocks stale catalog during loading or error',()=>{
 for(const field of ['loading','error']){state[field]=true;try{assert.match(store().addToCart('p','S','Siyah'),/Stok bilgisi/);}finally{state[field]=false;}}
});
test('positive stock accepts quantity above inventory: limits deferred',()=>assert.equal(store().addToCart('p','S','Siyah',6),null));

const ready={loading:false,error:false};
const failing={loading:false,error:true};
const refreshing={loading:true,error:false};
test('P2: old positive inventory is unavailable during loading and failure',()=>{
 for(const catalog of [refreshing,failing]){
   const stock=getSizeAvailability(product,'Siyah','S',catalog);
   assert.equal(stock.available,false);assert.equal(stock.inventory,null);assert.equal(stock.variant,null);
   assert.equal(stock.status,'unavailable');assert.notEqual(stock.label,'Tükendi');
 }
});
test('P2: catalog failure message takes priority over missing selection',()=>{
 assert.equal(stockSelectionError(product,'Siyah',null,failing),'Stok bilgisi şu anda doğrulanamıyor. Lütfen tekrar deneyin.');
 assert.equal(stockSelectionError(product,'Siyah','S',refreshing),'Stok bilgisi doğrulanıyor…');
});
function stockMarkup(catalog,p=product){
 return renderToStaticMarkup(React.createElement(StockSizeOptions,{product:p,color:'Siyah',size:'S',onSelect(){},catalog,onRetry:async()=>{}}));
}
test('P2: shared UI disables every stale size and exposes retry on error',()=>{
 const html=stockMarkup(failing);
 assert.equal((html.match(/disabled=""/g)||[]).length,product.sizes.length);
 assert.doesNotMatch(html,/aria-pressed="true"|Tükendi/);
 assert.match(html,/role="alert"/);assert.match(html,/Stok bilgisi şu anda doğrulanamıyor. Lütfen tekrar deneyin./);
 assert.match(html,/Tekrar Dene/);
});
test('P2: initial loading UI cannot select stock or invite duplicate retry',()=>{
 const html=stockMarkup(refreshing);
 assert.equal((html.match(/disabled=""/g)||[]).length,product.sizes.length);
 assert.match(html,/aria-busy="true"/);assert.match(html,/role="status"/);
 assert.doesNotMatch(html,/Tekrar Dene|Tükendi|aria-pressed="true"/);
});
test('P2: recovery uses updated positive stock and clears failure UI',()=>{
 const updated={...product,variants:product.variants.map(v=>v.id==='black-s'?{...v,inventory:2}:v)};
 assert.equal(getSizeAvailability(updated,'Siyah','S',ready).inventory,2);
 const html=stockMarkup(ready,updated);
 assert.match(html,/aria-pressed="true" aria-label="S"/);
 assert.doesNotMatch(html,/Tekrar Dene|doğrulanamıyor/);
});
test('P2: recovery with zero stock clears retained size and shows sold out',()=>{
 const updated={...product,variants:product.variants.map(v=>v.id==='black-s'?{...v,inventory:0}:v)};
 assert.equal(retainAvailableSize(updated,'Siyah','S',ready),null);
 const html=stockMarkup(ready,updated);
 assert.match(html,/disabled=""[^>]*aria-label="S — Tükendi"/);
 assert.doesNotMatch(html,/aria-pressed="true"/);
});
test('P2: rejected cart calls issue no state updates and leave cart untouched',()=>{
 for(const catalog of [ready,refreshing,failing]){
   Object.assign(state,catalog);
   try {
     const api=store();const before=structuredClone(api.cart);
     for(const [id,size] of [['p','M'],['p','L'],['unknown','S'],...(catalog.loading||catalog.error?[['p','S']]:[])]){
       updates.length=0;assert.equal(typeof api.addToCart(id,size,'Siyah'),'string');
       assert.deepEqual(updates,[]);assert.deepEqual(api.cart,before);
     }
   }finally{Object.assign(state,ready);}
 }
});
test('P2: state-update instrumentation detects a successful cart mutation',()=>{
 updates.length=0;assert.equal(store().addToCart('p','S','Siyah'),null);
 assert.equal(updates.length,2); // cart update and opening cart; rejection must invoke neither.
});
