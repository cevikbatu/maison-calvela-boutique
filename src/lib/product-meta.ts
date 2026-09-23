import { createServerFn } from '@tanstack/react-start';

const site = import.meta.env['VITE_PUBLIC_SITE_URL']?.replace(/\/$/,'');
const canonicalSite = site && /^https:\/\/(?!.*(?:preview|localhost|127\.0\.0\.1))[^/]+$/i.test(site) ? site : undefined;
export const productionSite = canonicalSite;

type Result = {head:{meta:Array<Record<string,string>>;links?:Array<{rel:string;href:string}>;scripts?:Array<{type:string;children:string}>}};
export const productMeta = createServerFn({method:'GET'}).inputValidator((slug:string)=>slug).handler(async ({data:slug}):Promise<Result>=>{
  const base=process.env['SUPABASE_URL'];const key=process.env['SUPABASE_PUBLISHABLE_KEY'];
  if(!base||!key)return {head:{meta:[{title:'Ürün | Maison Calvela'},{name:'description',content:'Maison Calvela koleksiyonu.'},{property:'og:title',content:'Ürün | Maison Calvela'},{property:'og:description',content:'Maison Calvela koleksiyonu.'},{property:'og:type',content:'product'},{name:'twitter:card',content:'summary_large_image'}]}};
  const headers={apikey:key};
  const url=new URL(`${base}/rest/v1/products`);url.searchParams.set('slug',`eq.${slug}`);url.searchParams.set('published','eq.true');url.searchParams.set('select','id,title,description,gender,slug');url.searchParams.set('limit','1');
  const response=await fetch(url,{headers});const rows=response.ok?await response.json() as Array<{id:string;title:string;description:string;gender:string;slug:string}>:[];const product=rows[0];
  const title=product?`${product.title} | Maison Calvela`:'Ürün | Maison Calvela';const description=product?.description?.slice(0,160)||'Maison Calvela kadın ve erkek koleksiyonu.';
  const meta:Array<Record<string,string>>=[{title},{name:'description',content:description},{property:'og:title',content:title},{property:'og:description',content:description},{property:'og:type',content:'product'},{name:'twitter:card',content:'summary_large_image'}];
  if(!product)return {head:{meta}};
  const imagesUrl=new URL(`${base}/rest/v1/product_images`);imagesUrl.searchParams.set('product_id',`eq.${product.id}`);imagesUrl.searchParams.set('select','url,alt');imagesUrl.searchParams.set('order','sort_order.asc');imagesUrl.searchParams.set('limit','1');
  const imageResponse=await fetch(imagesUrl,{headers});const images=imageResponse.ok?await imageResponse.json() as Array<{url:string;alt:string}>:[];
  const image=images[0]?.url;const absoluteImage=image?.startsWith('https://')?image:undefined;
  if(absoluteImage){meta.push({property:'og:image',content:absoluteImage},{name:'twitter:image',content:absoluteImage});}
  const productUrl=canonicalSite?`${canonicalSite}/urun/${encodeURIComponent(product.slug)}`:undefined;
  const jsonLd:Record<string,unknown>={'@context':'https://schema.org','@type':'Product',name:product.title,description,brand:{'@type':'Brand',name:'Maison Calvela'},category:product.gender==='kadin'?'Kadın giyim':'Erkek giyim'};
  if(absoluteImage)jsonLd['image']=absoluteImage;
  if(productUrl)jsonLd['url']=productUrl;
  return {head:{meta, ...(productUrl?{links:[{rel:'canonical',href:productUrl}]}:{}),scripts:[{type:'application/ld+json',children:JSON.stringify(jsonLd).replace(/</g,'\\u003c')}]}};
});