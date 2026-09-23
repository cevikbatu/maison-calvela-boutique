import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Product } from '@/data/catalog';
import { loadCatalog } from './catalog-data';



const Context = createContext<{products: Product[]; loading: boolean; error: boolean; reload: () => Promise<void>} | null>(null);
async function resolveImage(url:string):Promise<string>{if(!url.startsWith('catalog/'))return url;const {data,error}=await supabase.storage.from('catalog').download(url.slice(8));if(error||!data)return '';return new Promise<string>(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(typeof reader.result==='string'?reader.result:'');reader.onerror=()=>resolve('');reader.readAsDataURL(data);});}
export function CatalogProvider({children}:{children:ReactNode}) {
  const [products,setProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  async function reload(){
    setLoading(true);
    setError(false);
    try {
      setProducts(await loadCatalog(supabase,resolveImage));
    } catch (error) {
      console.error('Koleksiyon yüklenemedi',error);
      setError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{void reload()},[]);
  return <Context.Provider value={{products,loading,error,reload}}>{children}</Context.Provider>;
}
export function useCatalog(){const value=useContext(Context);if(!value)throw new Error('CatalogProvider is missing');return value;}
