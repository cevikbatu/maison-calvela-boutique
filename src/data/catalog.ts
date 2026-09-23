import womenTshirt from '@/assets/women-tshirt.jpg';
import womenTshirtAlt from '@/assets/women-tshirt-02.jpg';
import womenPolo from '@/assets/women-polo.jpg';
import womenPoloAlt from '@/assets/women-polo-02.jpg';
import womenLong from '@/assets/women-longsleeve.jpg';
import womenLongAlt from '@/assets/women-longsleeve-02.jpg';
import menTshirt from '@/assets/men-tshirt.jpg';
import menTshirtAlt from '@/assets/men-tshirt-02.jpg';
import menPolo from '@/assets/men-polo.jpg';
import menPoloAlt from '@/assets/men-polo-02.jpg';
import menLong from '@/assets/men-longsleeve.jpg';
import menLongAlt from '@/assets/men-longsleeve-02.jpg';

export type Gender = 'kadin' | 'erkek';
export type CategorySlug = 'tshirt' | 'polo' | 'uzun-kollu';
export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL';
export interface Category { slug: CategorySlug; name: string; }
export interface Collection { id: string; title: string; description: string; productIds: string[]; }
export interface ProductImage { id: string; productId: string; url: string; alt: string; sortOrder: number; }
export interface ProductVariant { id: string; productId: string; color: string; colorToken: string; size: Size; inventory: number; sku: string; }
export interface Product { id: string; slug: string; name: string; gender: Gender; category: CategorySlug; price: number; salePrice?: number; description: string; fabric: string; fit: string; care: string; colors: {name:string; token:string}[]; sizes: Size[]; images: string[]; featured: boolean; newArrival: boolean; visible: boolean; collectionIds: string[]; }
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
const colors = {
  ivory: {name:'Kırık Beyaz',token:'ivory'}, black:{name:'Siyah',token:'black'}, olive:{name:'Zeytin',token:'olive'}, taupe:{name:'Vizon',token:'taupe'}, charcoal:{name:'Antrasit',token:'charcoal'}, stone:{name:'Taş',token:'stone'}
};
const common = {sizes:['XS','S','M','L','XL'] as Size[], visible:true, collectionIds:['essentials'], care:'30°C hassas yıkama. Ters çevirerek yıkayınız. Düşük ısıda ütüleyiniz.', fit:'Modern, rahat kesim. Standart bedeninizi tercih edebilirsiniz.'};
export const products: Product[] = [
  { ...common,id:'w1',slug:'kadın-essentiel-beyaz-tshirt',name:'Essentiel Beyaz T-shirt',gender:'kadin',category:'tshirt',price:1890,description:'Günlük gardırobun sessiz imzası. Tok dokusu ve kusursuz çizgisiyle her anınıza eşlik eder.',fabric:'%100 premium pamuk, 220 g/m²',colors:[colors.ivory,colors.black],images:[womenTshirt,womenTshirtAlt],featured:true,newArrival:true},
  { ...common,id:'w2',slug:'kadın-noir-siyah-tshirt',name:'Noir Siyah T-shirt',gender:'kadin',category:'tshirt',price:1890,description:'Zamansız siyahın yalın ama güçlü yorumu. Özenle düşünülmüş bir temel parça.',fabric:'%100 premium pamuk, 220 g/m²',colors:[colors.black,colors.ivory],images:[womenTshirtAlt,womenTshirt],featured:false,newArrival:false},
  { ...common,id:'w3',slug:'kadın-signature-siyah-polo',name:'Signature Siyah Polo',gender:'kadin',category:'polo',price:2490,description:'Modern silueti rafine dokuyla buluşturan, gündüzden akşama kolayca taşınan polo.',fabric:'%96 pamuk, %4 elastan',colors:[colors.black,colors.ivory],images:[womenPolo,womenPoloAlt],featured:true,newArrival:true},
  { ...common,id:'w4',slug:'kadın-atelier-ekru-polo',name:'Atelier Ekru Polo',gender:'kadin',category:'polo',price:2490,description:'Yumuşak ekru tonu ve zarif yaka detayıyla sade şıklığın yeni hali.',fabric:'%96 pamuk, %4 elastan',colors:[colors.ivory,colors.black],images:[womenPoloAlt,womenPolo],featured:false,newArrival:false},
  { ...common,id:'w5',slug:'kadın-forme-zeytin-uzun-kollu',name:'Forme Zeytin Uzun Kollu',gender:'kadin',category:'uzun-kollu',price:2890,description:'Hafif örgüsü ve doğal zeytin tonuyla mevsimler arası zarif bir geçiş.',fabric:'%70 pamuk, %30 modal ince triko',colors:[colors.olive,colors.taupe],images:[womenLong,womenLongAlt],featured:true,newArrival:true},
  { ...common,id:'w6',slug:'kadın-ligne-vizon-uzun-kollu',name:'Ligne Vizon Uzun Kollu',gender:'kadin',category:'uzun-kollu',price:2890,description:'İnce ribana dokusuyla bedene uyum sağlayan, çok yönlü bir katman.',fabric:'%70 pamuk, %30 modal ince triko',colors:[colors.taupe,colors.olive],images:[womenLongAlt,womenLong],featured:false,newArrival:false},
  { ...common,id:'m1',slug:'erkek-essentiel-siyah-tshirt',name:'Essentiel Siyah T-shirt',gender:'erkek',category:'tshirt',price:1890,description:'Tok pamuk dokusu ve temiz hatlarıyla her gün yeniden giyilecek bir klasik.',fabric:'%100 premium pamuk, 220 g/m²',colors:[colors.black,colors.ivory],images:[menTshirt,menTshirtAlt],featured:true,newArrival:true},
  { ...common,id:'m2',slug:'erkek-noir-ekru-tshirt',name:'Noir Ekru T-shirt',gender:'erkek',category:'tshirt',price:1890,description:'Sade ekru tonu ve dengeli kesimiyle gardırobun en güvenilir parçası.',fabric:'%100 premium pamuk, 220 g/m²',colors:[colors.ivory,colors.black],images:[menTshirtAlt,menTshirt],featured:false,newArrival:false},
  { ...common,id:'m3',slug:'erkek-signature-ekru-polo',name:'Signature Ekru Polo',gender:'erkek',category:'polo',price:2490,description:'Klasik polonun çağdaş yorumunda rahatlık ve zarafet bir araya gelir.',fabric:'%96 pamuk, %4 elastan',colors:[colors.ivory,colors.olive],images:[menPolo,menPoloAlt],featured:true,newArrival:true},
  { ...common,id:'m4',slug:'erkek-atelier-zeytin-polo',name:'Atelier Zeytin Polo',gender:'erkek',category:'polo',price:2490,description:'Doğal zeytin tonu ve yumuşak dokusuyla çabasız bir duruş.',fabric:'%96 pamuk, %4 elastan',colors:[colors.olive,colors.ivory],images:[menPoloAlt,menPolo],featured:false,newArrival:false},
  { ...common,id:'m5',slug:'erkek-forme-antrasit-uzun-kollu',name:'Forme Antrasit Uzun Kollu',gender:'erkek',category:'uzun-kollu',price:2890,description:'Hafif triko yapısıyla yeni sezonun sakin ve güçlü silueti.',fabric:'%70 pamuk, %30 modal ince triko',colors:[colors.charcoal,colors.stone],images:[menLong,menLongAlt],featured:true,newArrival:true},
  { ...common,id:'m6',slug:'erkek-ligne-tas-uzun-kollu',name:'Ligne Taş Uzun Kollu',gender:'erkek',category:'uzun-kollu',price:2890,description:'Taş rengiyle doğal, ince örgüsüyle konforlu. Katmanlı giyimin rafine hali.',fabric:'%70 pamuk, %30 modal ince triko',colors:[colors.stone,colors.charcoal],images:[menLongAlt,menLong],featured:false,newArrival:false},
];
export const collections: Collection[] = [{id:'essentials',title:'The Essential Edit',description:'Gündelik giyimin olağanüstü yorumu.',productIds:products.map(p=>p.id)}];
export const formatPrice = (value:number) => new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0}).format(value);
export const getProduct = (slug:string) => products.find(p=>p.slug===slug && p.visible);
