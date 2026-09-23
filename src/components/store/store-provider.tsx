import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { CartItem, Size } from '@/data/catalog';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

type StoreContextValue = {
  favorites: string[]; cart: CartItem[]; user: User|null; syncError: string;
  toggleFavorite: (id:string)=>void;
  addToCart: (productId:string,size:Size,color:string,quantity?:number)=>void;
  updateQuantity: (productId:string,size:Size,color:string,quantity:number)=>void;
  removeFromCart: (productId:string,size:Size,color:string)=>void;
  cartOpen: boolean; setCartOpen: (open:boolean)=>void;
  searchOpen: boolean; setSearchOpen: (open:boolean)=>void;
};
const StoreContext=createContext<StoreContextValue|null>(null);
const key=(item:CartItem)=>`${item.productId}:${item.size}:${item.color}`;
const validCart=(v:unknown):v is CartItem=>typeof v==='object'&&v!==null&&typeof (v as CartItem).productId==='string'&&typeof (v as CartItem).size==='string'&&typeof (v as CartItem).color==='string'&&Number.isSafeInteger((v as CartItem).quantity)&&(v as CartItem).quantity>0;
function guestData(){try{const f:unknown=JSON.parse(localStorage.getItem('mc-favorites')||'[]');const c:unknown=JSON.parse(localStorage.getItem('mc-cart')||'[]');return {favorites:Array.isArray(f)?f.filter((v):v is string=>typeof v==='string'):[],cart:Array.isArray(c)?c.filter(validCart):[]};}catch{return {favorites:[],cart:[]};}}
export function StoreProvider({children}:{children:ReactNode}){
  const [favorites,setFavorites]=useState<string[]>([]);const [cart,setCart]=useState<CartItem[]>([]);const [user,setUser]=useState<User|null>(null);const [syncError,setSyncError]=useState('');const [cartOpen,setCartOpen]=useState(false);const [searchOpen,setSearchOpen]=useState(false);
  const active=useRef<{id:string;cartId:string|null;variants:Map<string,string>;itemIds:Map<string,string>}|null>(null);
  const loaded=useRef(false);const generation=useRef(0);const queue=useRef(Promise.resolve());
  function persist(task:()=>Promise<void>){queue.current=queue.current.then(task).catch(()=>{setSyncError('Hesap verileriniz eşitlenemedi. Lütfen sayfayı yenileyip yeniden deneyin.');});}
  useEffect(()=>{
    const guest=guestData();setFavorites(guest.favorites);setCart(guest.cart);loaded.current=true;
    async function load(u:User|null){const stamp=++generation.current;
      if(!u){active.current=null;setUser(null);const data=guestData();setFavorites(data.favorites);setCart(data.cart);setSyncError('');return;}
      const guest=guestData();
      try{
        const [f,cs,vs]=await Promise.all([supabase.from('favorites').select('product_id').eq('user_id',u.id),supabase.from('carts').select('id').eq('user_id',u.id).maybeSingle(),supabase.from('product_variants').select('id,product_id,size,color')]);
        if(f.error||cs.error||vs.error)throw f.error||cs.error||vs.error;
        if(stamp!==generation.current)return;
        let cartId=cs.data?.id??null;const variants=new Map((vs.data??[]).map(v=>[`${v.product_id}:${v.size}:${v.color}`,v.id]));
        const known=new Set((f.data??[]).map(v=>v.product_id));const newly=guest.favorites.filter(id=>!known.has(id));
        if(newly.length){const {error}=await supabase.from('favorites').upsert(newly.map(product_id=>({user_id:u.id,product_id})),{onConflict:'user_id,product_id',ignoreDuplicates:true});if(error)throw error;newly.forEach(id=>known.add(id));}
        if(guest.cart.length&&!cartId){const {data,error}=await supabase.from('carts').insert({user_id:u.id}).select('id').single();if(error)throw error;cartId=data.id;}
        const itemIds=new Map<string,string>();const combined=new Map<string,CartItem>();
        if(cartId){const {data,error}=await supabase.from('cart_items').select('id,variant_id,quantity').eq('cart_id',cartId);if(error)throw error;
          const byVariant=new Map((vs.data??[]).map(v=>[v.id,v]));
          for(const item of data??[]){const variant=byVariant.get(item.variant_id);if(!variant)continue;const value={productId:variant.product_id,size:variant.size as Size,color:variant.color,quantity:item.quantity};combined.set(key(value),value);itemIds.set(key(value),item.id);}
          for(const guestItem of guest.cart){const variant=variants.get(key(guestItem));if(!variant)continue;const old=combined.get(key(guestItem));const quantity=Math.min(99,(old?.quantity??0)+guestItem.quantity);
            if(old){const {error}=await supabase.from('cart_items').update({quantity}).eq('id',itemIds.get(key(guestItem))!);if(error)throw error;}
            else{const {data,error}=await supabase.from('cart_items').insert({cart_id:cartId,variant_id:variant,quantity}).select('id').single();if(error)throw error;itemIds.set(key(guestItem),data.id);}
            combined.set(key(guestItem),{...guestItem,quantity});
          }
        }
        if(stamp!==generation.current)return;
        localStorage.removeItem('mc-favorites');localStorage.removeItem('mc-cart');active.current={id:u.id,cartId,variants,itemIds};setFavorites([...known]);setCart([...combined.values()]);setUser(u);setSyncError('');
      }catch{if(stamp===generation.current){setSyncError('Hesap verileriniz eşitlenemedi. Misafir verileriniz bu tarayıcıda korundu; lütfen tekrar deneyin.');setUser(u);}}
    }
    void supabase.auth.getUser().then(({data})=>{if(loaded.current)void load(data.user)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='USER_UPDATED'){setTimeout(()=>{void load(session?.user??null)},0)}});
    return ()=>{generation.current++;subscription.unsubscribe()};
  },[]);
  useEffect(()=>{if(loaded.current&&!user&&!active.current)localStorage.setItem('mc-favorites',JSON.stringify(favorites))},[favorites,user]);
  useEffect(()=>{if(loaded.current&&!user&&!active.current)localStorage.setItem('mc-cart',JSON.stringify(cart))},[cart,user]);
  function toggleFavorite(id:string){const existing=favorites.includes(id);setFavorites(current=>existing?current.filter(v=>v!==id):[...current,id]);const account=active.current;if(account)persist(async()=>{const {error}=existing?await supabase.from('favorites').delete().eq('user_id',account.id).eq('product_id',id):await supabase.from('favorites').upsert({user_id:account.id,product_id:id},{onConflict:'user_id,product_id'});if(error)throw error;});}
  function saveItem(item:CartItem,quantity:number){const account=active.current;if(!account)return;persist(async()=>{const variant=account.variants.get(key(item));if(!variant)throw new Error('Bu varyant artık kullanılamıyor.');if(!account.cartId){const {data,error}=await supabase.from('carts').insert({user_id:account.id}).select('id').single();if(error)throw error;account.cartId=data.id;}const id=account.itemIds.get(key(item));if(quantity===0){if(id){const {error}=await supabase.from('cart_items').delete().eq('id',id);if(error)throw error;account.itemIds.delete(key(item));}return;}
    if(id){const {error}=await supabase.from('cart_items').update({quantity}).eq('id',id);if(error)throw error;}else{const {data,error}=await supabase.from('cart_items').insert({cart_id:account.cartId!,variant_id:variant,quantity}).select('id').single();if(error)throw error;account.itemIds.set(key(item),data.id);}});}
  function addToCart(productId:string,size:Size,color:string,quantity=1){const item={productId,size,color,quantity};const next=Math.min(99,(cart.find(v=>key(v)===key(item))?.quantity??0)+quantity);setCart(current=>current.some(v=>key(v)===key(item))?current.map(v=>key(v)===key(item)?{...v,quantity:next}:v):[...current,{...item,quantity:next}]);saveItem(item,next);setCartOpen(true);}
  function updateQuantity(productId:string,size:Size,color:string,quantity:number){const item={productId,size,color,quantity:Math.max(1,Math.min(99,quantity))};setCart(current=>current.map(v=>key(v)===key(item)?item:v));saveItem(item,item.quantity);}
  function removeFromCart(productId:string,size:Size,color:string){const item={productId,size,color,quantity:1};setCart(current=>current.filter(v=>key(v)!==key(item)));saveItem(item,0);}
  return <StoreContext.Provider value={{favorites,cart,user,syncError,toggleFavorite,addToCart,updateQuantity,removeFromCart,cartOpen,setCartOpen,searchOpen,setSearchOpen}}>{children}</StoreContext.Provider>;
}
export function useStore(){const value=useContext(StoreContext);if(!value)throw new Error('StoreProvider is missing');return value;}
