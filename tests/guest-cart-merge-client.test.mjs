import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const client='data:text/javascript,'+encodeURIComponent('export const supabase={rpc:(...args)=>globalThis.__mergeRpc(...args)};');
const hooks=registerHooks({
 resolve(s,c,next){if(s==='@/integrations/supabase/client')return {url:client,shortCircuit:true};return next(s,c);},
 load(url,c,next){if(url.endsWith('/guest-cart-merge.ts'))return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText};return next(url,c);}
});
const {normalizeMergeLines,eligibleGuestLines,mergeGuestCartForUser,readGuestCart,persistGuestCart,cartStateStorageKey}=await import('../src/components/store/guest-cart-merge.ts');
hooks.deregister();
const line=(quantity,color='Siyah',size='M')=>({productId:'p1',size,color,quantity});
let calls,storage;
function setup(cart=[line(3)]){
 calls=[];storage=new Map([['mc-cart',JSON.stringify(cart)]]);
 globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 let queue=Promise.resolve();
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request(name,task){const pending=queue.then(task);queue=pending.catch(()=>{});return pending;}}}});
 globalThis.__mergeRpc=async(name,args)=>{calls.push(structuredClone(args));return {data:args.p_items.map(({quantity,...v})=>({...v,accepted:quantity,remaining:0})),error:null};};
}
test('actual helper keeps color and size identities separate',()=>{
 assert.equal(normalizeMergeLines([line(2),line(3),line(4,'Beyaz'),line(1,'Siyah','L')]).length,3);
 assert.deepEqual(eligibleGuestLines([line(5)],[line(2)]),[line(3)]);
});
test('partial receipt preserves remainder and does not automatically resend it',async()=>{
 setup();globalThis.__mergeRpc=async(name,args)=>{calls.push(args);return {data:[{...line(3),accepted:2,remaining:1}],error:null};};
 assert.equal((await mergeGuestCartForUser('u')).remaining,1);assert.deepEqual(readGuestCart(),[line(1)]);
 assert.equal((await mergeGuestCartForUser('u')).attempted,false);assert.equal(calls.length,1);
});
test('lost response retry reuses the exact persisted request and payload',async()=>{
 setup();globalThis.__mergeRpc=async(name,args)=>{calls.push(structuredClone(args));if(calls.length===1)throw new Error('lost response');return {data:[{...line(3),accepted:3,remaining:0}],error:null};};
 await assert.rejects(mergeGuestCartForUser('u'),/lost response/);assert.deepEqual(readGuestCart(),[line(3)]);
 await mergeGuestCartForUser('u');assert.deepEqual(calls[0],calls[1]);assert.deepEqual(readGuestCart(),[]);
});
test('two merge calls sharing browser lock make one RPC',async()=>{
 setup();await Promise.all([mergeGuestCartForUser('u'),mergeGuestCartForUser('u')]);assert.equal(calls.length,1);assert.deepEqual(readGuestCart(),[]);
});
test('invalid receipt cannot consume guest quantities',async()=>{
 setup();globalThis.__mergeRpc=async()=>({data:[{...line(3),accepted:4,remaining:0}],error:null});
 await assert.rejects(mergeGuestCartForUser('u'),/Invalid merge receipt/);assert.deepEqual(readGuestCart(),[line(3)]);
});
test('failed durable snapshot prevents any RPC',async()=>{
 setup();readGuestCart();localStorage.setItem=()=>{throw new Error('quota');};
 await assert.rejects(mergeGuestCartForUser('u'),/quota/);assert.equal(calls.length,0);
});
test('missing Web Locks fails closed without unsafe localStorage lease',async()=>{
 setup();Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
 await assert.rejects(mergeGuestCartForUser('u'),/desteklenmiyor/);assert.equal(calls.length,0);assert.equal(storage.has('mc-cart'),true);
});
test('identical persistence does not generate repeated storage broadcasts',async()=>{
 setup();readGuestCart();let writes=0;localStorage.setItem=(k,v)=>{writes++;storage.set(k,v);};
 await persistGuestCart([line(3)]);assert.equal(writes,0);assert.ok(storage.has(cartStateStorageKey()));
});
test('combined quantity overflow is rejected',()=>{
 assert.throws(()=>normalizeMergeLines([line(2147483647),line(1)]),/Geçersiz sepet miktarı/);
});

test('stale tab snapshot cannot overwrite newer guest cart',async()=>{
 setup();const before=readGuestCart();await persistGuestCart([line(4)],before);
 await assert.rejects(persistGuestCart([line(2)],before),/başka bir sekmede/);assert.deepEqual(readGuestCart(),[line(4)]);
});
test('pending uncertain receipt prevents guest edits from consuming a different snapshot',async()=>{
 setup();globalThis.__mergeRpc=async()=>{throw new Error('offline');};
 await assert.rejects(mergeGuestCartForUser('u'));await assert.rejects(persistGuestCart([line(4)],[line(3)]),/Bekleyen/);assert.deepEqual(readGuestCart(),[line(3)]);
});
test('session switch before lock acquisition sends no RPC',async()=>{
 setup();await assert.rejects(mergeGuestCartForUser('u',()=>false),/Oturum değişti/);assert.equal(calls.length,0);
});
test('session switch while request completes retains receipt snapshot for later retry',async()=>{
 setup();let active=true;globalThis.__mergeRpc=async(name,args)=>{calls.push(args);active=false;return {data:[{...line(3),accepted:3,remaining:0}],error:null};};
 await assert.rejects(mergeGuestCartForUser('u',()=>active),/Oturum değişti/);assert.deepEqual(readGuestCart(),[line(3)]);
 assert.equal(JSON.parse(storage.get(cartStateStorageKey())).pendingByUser.u.requestId,calls[0].p_request_id);
 assert.equal(calls[0].p_expected_user_id,'u');
});
