import test from 'node:test';
import assert from 'node:assert/strict';
import {readRetailPrice,unitPrice,linePrice,cartSubtotal} from '../src/components/store/retail-price.ts';
import {formatPrice} from '../src/data/catalog.ts';
const product={id:'p',price:12.35};const item={productId:'p',size:'M',color:'Siyah',quantity:3};
test('unknown invalid and empty prices remain unavailable, not free',()=>{
 for(const value of [null,undefined,'', ' ', -1,NaN,Infinity,true,{},'invalid'])assert.equal(readRetailPrice(value),null);
 assert.equal(formatPrice(null),'Fiyat bilgisi mevcut değil');assert.equal(readRetailPrice(0),0);
});
test('TRY formatting preserves real kuruş amounts',()=>{
 assert.match(formatPrice(1234.56),/1\.234,56/);assert.match(formatPrice(1234.56),/₺/);
});
test('only a valid lower sale price is used',()=>{
 assert.equal(unitPrice({...product,salePrice:10}),10);assert.equal(unitPrice({...product,salePrice:-1}),12.35);
 assert.equal(unitPrice({...product,salePrice:15}),12.35);assert.equal(unitPrice({...product,price:null,salePrice:10}),null);
});
test('cart totals use cents and never omit unavailable product prices',()=>{
 assert.equal(linePrice(product,3),37.05);assert.equal(cartSubtotal([product],[item]),37.05);
 assert.equal(cartSubtotal([], [item]),null);assert.equal(cartSubtotal([{...product,price:null}],[item]),null);
 assert.equal(cartSubtotal([{id:'p',price:0.1},{id:'q',price:0.2}],[{...item,quantity:1},{...item,productId:'q',quantity:1}]),0.3);
});
