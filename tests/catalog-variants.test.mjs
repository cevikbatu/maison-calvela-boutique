import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCatalog } from '../src/components/store/catalog-data.ts';
import { getProductVariantStock } from '../src/data/catalog.ts';
import { registerHooks } from 'node:module';

// Resolve the application's TypeScript alias only inside this Node test runner.
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === '@/data/catalog'
    ? new URL('../src/data/catalog.ts', import.meta.url).href : specifier, context);
} });
const { searchProducts } = await import('../src/lib/store-search.ts');
hooks.deregister();

const product = (id, gender='kadin') => ({id,slug:id,title:`${id} Polo`,gender,category_id:'polo',description:'Test polo',fabric:'',production_note:'',model_height:'',model_size:'',size_measurements:{},sizes:['S','M'],colors:[{name:'Siyah',token:'black'},{name:'Beyaz',token:'ivory'}],published:true,featured:true,new_arrival:true});
const variant = (id, product_id, color, size, inventory=0) => ({id,product_id,color,size,inventory,sku:null,updated_at:'2026-09-23T10:00:00Z'});
const rows = [variant('black-S','a','Siyah','S',5),variant('black-M','a','Siyah','M',8),variant('white-S','a','Beyaz','S',3),variant('white-M','a','Beyaz','M',0),variant('other-product','b','Siyah','S',17)];
function client({products=[product('a'),product('b','erkek')],variants=rows,prices=[],fail=false}={}) {
  const calls=[];
  return {calls,from(table){
    let values=table==='products'?products:table==='categories'?[{id:'polo',slug:'polo'}]:table==='product_variants'?variants:table==='product_prices'?prices:[];
    let start=0,end=Infinity;const call={table};calls.push(call);
    const q={select(columns){call.columns=columns;return q},eq(key,value){values=values.filter(v=>v[key]===value);return q},in(key,list){call.productIds=list;values=values.filter(v=>list.includes(v[key]));return q},order(){return q},range(a,b){start=a;end=b;return q},then(resolve,reject){return Promise.resolve(fail&&table==='product_variants'?{data:null,error:{message:'simulated 503'}}:{data:values.slice(start,end+1),error:null}).then(resolve,reject)}};
    return q;
  }};
}
const load=c=>loadCatalog(c,async url=>url);

test('variants attach only to their exact product and preserve nullable SKU/timestamp',async()=>{
  const db=client();const [a,b]=await load(db);
  assert.deepEqual(a.variants.map(v=>v.id),['black-S','black-M','white-S','white-M']);
  assert.deepEqual(b.variants.map(v=>v.id),['other-product']);
  assert.equal(a.variants[0].sku,null);assert.equal(a.variants[0].updatedAt,rows[0].updated_at);
  assert.deepEqual(db.calls.find(c=>c.table==='product_variants').productIds,['a','b']);
});
test('different sizes never share inventory',async()=>{
  const [p]=await load(client());
  assert.equal(getProductVariantStock(p,'Siyah','S').inventory,5);
  assert.equal(getProductVariantStock(p,'Siyah','M').inventory,8);
});
test('different colors never share a variant',async()=>{
  const [p]=await load(client());
  assert.equal(getProductVariantStock(p,'Siyah','S').variant.id,'black-S');
  assert.equal(getProductVariantStock(p,'Beyaz','S').variant.id,'white-S');
});
test('zero inventory remains known zero, not missing or unlimited',async()=>{
  const [p]=await load(client());const stock=getProductVariantStock(p,'Beyaz','M');
  assert.equal(stock.status,'known');assert.equal(stock.inventory,0);assert.equal(stock.variant.id,'white-M');
});
test('missing expected combination has explicit unavailable/null stock',async()=>{
  const [p]=await load(client({variants:rows.filter(v=>v.id!=='white-M')}));
  assert.deepEqual(getProductVariantStock(p,'Beyaz','M'),{status:'unavailable',variant:null,inventory:null});
  assert.deepEqual(p.sizes,['S','M']);assert.equal(p.colors.length,2);
});
test('no fuzzy matching, trimming or case folding',async()=>{
  const [p]=await load(client());
  for(const [color,size] of [['siyah','S'],['Siyah ','S'],['Siyah','s'],['Beyaz','XL']]) assert.equal(getProductVariantStock(p,color,size).status,'unavailable');
});
test('variant query error rejects complete load, then a successful retry returns catalog',async()=>{
  await assert.rejects(load(client({fail:true})),{ message: 'simulated 503' });
  assert.equal((await load(client())).length,2);
});
test('successful empty product response is still an empty catalog',async()=>{
  const db=client({products:[]});assert.deepEqual(await load(db),[]);
  assert.equal(db.calls.some(c=>c.table==='product_variants'),false);
});
test('unpublished products and their variants stay outside storefront',async()=>{
  const db=client({products:[product('a'),{...product('b'),published:false}]});
  const products=await load(db);assert.equal(products.length,1);
  assert.deepEqual(db.calls.find(c=>c.table==='product_variants').productIds,['a']);
});
test('existing catalog/filter fields and search results do not depend on stock',async()=>{
  const baseline=[product('a'),product('b','erkek')];const loaded=await load(client({products:baseline}));
  for(let i=0;i<baseline.length;i++){
    assert.deepEqual(loaded[i].colors,baseline[i].colors);assert.deepEqual(loaded[i].sizes,baseline[i].sizes);
    assert.equal(loaded[i].gender,baseline[i].gender);assert.equal(loaded[i].category,'polo');
    assert.equal(loaded[i].visible,true);assert.equal(loaded[i].newArrival,true);
  }
  assert.equal(searchProducts('kadın polo',loaded).length,1);
  assert.equal(searchProducts('bulunmayan',loaded).length,0);
});
test('variant pagination retains rows beyond the API page size',async()=>{
  const variants=Array.from({length:1001},(_,i)=>variant(`v${i}`,'a','Siyah',`size${i}`,i));
  const db=client({products:[product('a')],variants});const [p]=await load(db);
  assert.equal(p.variants.length,1001);assert.equal(getProductVariantStock(p,'Siyah','size1000').inventory,1000);
  assert.equal(db.calls.filter(c=>c.table==='product_variants').length,2);
});

test('catalog reads actual retail prices and preserves missing prices as null',async()=>{
 const [a,b]=await load(client({prices:[{product_id:'a',price:'1234.56',sale_price:'999.90'}]}));
 assert.equal(a.price,1234.56);assert.equal(a.salePrice,999.9);assert.equal(b.price,null);
});