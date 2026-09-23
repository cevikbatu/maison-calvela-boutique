import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { type CategorySlug, type Gender, type Product, type Size } from '@/data/catalog';
import type { Database } from '@/integrations/supabase/types';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ImageRow = Database['public']['Tables']['product_images']['Row'];
const Context = createContext<{products: Product[]; loading: boolean; reload: () => Promise<void>} | null>(null);
export function catalogImage(url:string) { return url; }
async function resolveImage(url:string):Promise<string>{if(!url.startsWith('catalog/'))return url;const {data,error}=await supabase.storage.from('catalog').download(url.slice(8));if(error||!data)return '';return URL.createObjectURL(data);}
function adapt(row:ProductRow, categories:Record<string,CategorySlug>, images:ImageRow[]): Product {
  const rawColors=Array.isArray(row.colors)?row.colors:[];
  const colors=rawColors.filter((v):v is {name:string;token:string}=>typeof v==='object'&&v!==null&&!Array.isArray(v)&&typeof v['name']==='string'&&typeof v['token']==='string');
  return {id:row.id,slug:row.slug,name:row.title,gender:row.gender as Gender,category:categories[row.category_id]??'tshirt',price:0,description:row.description,fabric:row.fabric,fit:row.fit,care:row.care,colors,sizes:row.sizes as Size[],images:images.filter(i=>i.product_id===row.id).sort((a,b)=>a.sort_order-b.sort_order).map(i=>catalogImage(i.url)),featured:row.featured,newArrival:row.new_arrival,visible:row.published,collectionIds:[]};
}
export function CatalogProvider({children}:{children:ReactNode}) {
  const [products,setProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true);
  async function reload(){
    const [p,c,i]=await Promise.all([supabase.from('products').select('*').eq('published',true).order('created_at'),supabase.from('categories').select('id,slug'),supabase.from('product_images').select('*')]);
    if(!p.error&&!c.error&&!i.error){const resolved=await Promise.all((i.data??[]).map(async image=>({...image,url:await resolveImage(image.url)})));setProducts((p.data??[]).map(row=>adapt(row,Object.fromEntries((c.data??[]).map(cat=>[cat.id,cat.slug as CategorySlug])),resolved)));} else console.error('Koleksiyon yüklenemedi',p.error??c.error??i.error);
    setLoading(false);
  }
  useEffect(()=>{void reload()},[]);
  return <Context.Provider value={{products,loading,reload}}>{children}</Context.Provider>;
}
export function useCatalog(){const value=useContext(Context);if(!value)throw new Error('CatalogProvider is missing');return value;}
