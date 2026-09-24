import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Product } from '@/data/catalog';
import { loadCatalog } from './catalog-data';



const Context = createContext<{products: Product[]; loading: boolean; error: boolean; reload: () => Promise<void>} | null>(null);
async function resolveImage(url:string):Promise<string>{if(!url.startsWith('catalog/'))return url;const {data,error}=await supabase.storage.from('catalog').download(url.slice(8));if(error||!data)return '';return new Promise<string>(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(typeof reader.result==='string'?reader.result:'');reader.onerror=()=>resolve('');reader.readAsDataURL(data);});}
export function CatalogProvider({children}:{children:ReactNode}) {
  const [products,setProducts]=useState<Product[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const request=useRef(0);
  async function reload(){
    const version=++request.current;
    setLoading(true);
    setError(false);
    try {
      const next=await loadCatalog(supabase,resolveImage);
      if(version===request.current)setProducts(next);
    } catch (error) {
      console.error('Koleksiyon yüklenemedi',error);
      if(version===request.current)setError(true);
    } finally {
      if(version===request.current)setLoading(false);
    }
  }
  useEffect(()=>{void reload();return ()=>{request.current++}},[]);
  return <Context.Provider value={{products,loading,error,reload}}>{children}</Context.Provider>;
}
export function useCatalog(){const value=useContext(Context);if(!value)throw new Error('CatalogProvider is missing');return value;}
