import type { CartItem, Product } from '../../data/catalog';

export function readRetailPrice(value: unknown): number | null {
  if(value===null||value===undefined||(typeof value==='string'&&!value.trim()))return null;
  if(typeof value!=='number'&&typeof value!=='string')return null;
  const amount=Number(value);
  return Number.isFinite(amount)&&amount>=0&&Number.isSafeInteger(Math.round(amount*100))?Math.round(amount*100)/100:null;
}
export function unitPrice(product: Product | undefined): number | null {
  if(!product)return null;
  const regular=readRetailPrice(product.price),sale=readRetailPrice(product.salePrice);
  if(regular===null)return null;
  return sale!==null&&sale<regular?sale:regular;
}
export function linePrice(product: Product | undefined,quantity: number): number | null {
  const unit=unitPrice(product);
  if(unit===null||!Number.isSafeInteger(quantity)||quantity<1)return null;
  const cents=Math.round(unit*100)*quantity;
  return Number.isSafeInteger(cents)?cents/100:null;
}
export function cartSubtotal(products: Product[],cart: CartItem[]): number | null {
  let cents=0;
  for(const item of cart){const value=linePrice(products.find(p=>p.id===item.productId),item.quantity);if(value===null)return null;cents+=Math.round(value*100);if(!Number.isSafeInteger(cents))return null;}
  return cents/100;
}
