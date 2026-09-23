export type Gender = 'kadin' | 'erkek';
export type CategorySlug = 'tshirt' | 'polo' | 'uzun-kollu';
export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL';
export interface Category { slug: CategorySlug; name: string; }
export interface Collection { id: string; title: string; description: string; productIds: string[]; }
export interface ProductImage { id: string; productId: string; url: string; alt: string; sortOrder: number; }
export interface ProductVariant { id: string; productId: string; color: string; colorToken: string; size: Size; inventory: number; sku: string; }
export interface Product { id: string; slug: string; name: string; gender: Gender; category: CategorySlug; price: number; salePrice?: number; description: string; fabric: string; productionNote?: string; modelHeight?: string; modelSize?: string; sizeMeasurements?: import('@/lib/measurements').ProductMeasurements; colors: {name:string; token:string}[]; sizes: Size[]; images: string[]; featured: boolean; newArrival: boolean; visible: boolean; collectionIds: string[]; }
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
export const formatPrice = (value:number) => new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0}).format(value);
