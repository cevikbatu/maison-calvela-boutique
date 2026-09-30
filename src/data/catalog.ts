export type Gender = 'kadin' | 'erkek';
export type CategorySlug = 'tshirt' | 'polo' | 'uzun-kollu';
export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL';
export interface Category { slug: CategorySlug; name: string; }
export interface Collection { id: string; title: string; description: string; productIds: string[]; }
export interface ProductImage { id: string; productId: string; url: string; alt: string; sortOrder: number; }
export interface ProductVariant { id: string; productId: string; color: string; colorToken: string | null; size: string; inventory: number; sku: string | null; updatedAt: string; }
export interface Product { id: string; slug: string; name: string; gender: Gender; category: CategorySlug; price: number | null; salePrice?: number; description: string; fabric: string; productionNote?: string; modelHeight?: string; modelSize?: string; sizeMeasurements?: import('@/lib/measurements').ProductMeasurements; colors: {name:string; token:string}[]; sizes: Size[]; images: string[]; featured: boolean; newArrival: boolean; visible: boolean; collectionIds: string[]; variants: ProductVariant[]; }
export interface Profile { id: string; displayName?: string; email?: string; createdAt: string; }
export interface Favorite { profileId: string; productId: string; }
export interface CartItem { productId: string; size: Size; color: string; quantity: number; }
export interface Order { id: string; profileId: string; total: number; status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'; createdAt: string; }
export interface OrderItem { orderId: string; productId: string; variantId: string; quantity: number; unitPrice: number; }
// Prepared for a future protected administration service. Never grant access from browser state.
export interface ProductDraft extends Omit<Product, 'id' | 'images'> { images: ProductImage[]; variants: ProductVariant[]; }

export const categories: Category[] = [
  {slug:'tshirt',name:'T-shirt'}, {slug:'polo',name:'Polo Yaka'}, {slug:'uzun-kollu',name:'Uzun Kollu'}
];
export const formatPrice = (value:number|null) => value===null||!Number.isFinite(value)||value<0 ? 'Fiyat bilgisi mevcut değil' : new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);

export type ProductVariantStock =
  | { status: 'known'; variant: ProductVariant; inventory: number }
  | { status: 'unavailable'; variant: null; inventory: null };

// Database identity is exact: no trimming, case folding, or color/size guessing.
export function getProductVariantStock(product: Product, color: string, size: string): ProductVariantStock {
  const variant = product.variants.find(v => v.productId === product.id && v.color === color && v.size === size);
  return variant ? { status: 'known', variant, inventory: variant.inventory } : { status: 'unavailable', variant: null, inventory: null };
}