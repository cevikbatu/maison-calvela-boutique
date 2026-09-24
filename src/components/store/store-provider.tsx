import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { CartItem, Size } from '@/data/catalog';
import { supabase } from '@/integrations/supabase/client';
import { useCatalog } from './catalog-provider';
import { cartQuantityError, cartQuantityMessage } from './cart-stock';
import type { User } from '@supabase/supabase-js';

type StoreContextValue = {
  favorites: string[]; cart: CartItem[]; user: User|null; syncError: string;
  toggleFavorite: (id:string)=>void;
  addToCart: (productId:string,size:Size,color:string,quantity?:number)=>string|null;
  updateQuantity: (productId:string,size:Size,color:string,quantity:number)=>string|null;
  removeFromCart: (productId:string,size:Size,color:string)=>void;
  cartOpen: boolean; setCartOpen: (open:boolean)=>void;
  searchOpen: boolean; setSearchOpen: (open:boolean)=>void;
};
const StoreContext=createContext<StoreContextValue|null>(null);
const key=(item:CartItem)=>`${item.productId}:${item.size}:${item.color}`;
const validCart=(v:unknown):v is CartItem=>typeof v==='object'&&v!==null&&typeof (v as CartItem).productId==='string'&&typeof (v as CartItem).size==='string'&&typeof (v as CartItem).color==='string'&&Number.isSafeInteger((v as CartItem).quantity)&&(v as CartItem).quantity>0;
function guestData(){try{const f:unknown=JSON.parse(localStorage.getItem('mc-favorites')||'[]');const c:unknown=JSON.parse(localStorage.getItem('mc-cart')||'[]');return {favorites:Array.isArray(f)?f.filter((v):v is string=>typeof v==='string'):[],cart:Array.isArray(c)?c.filter(validCart):[]};}catch{return {favorites:[],cart:[]};}}
export function StoreProvider({children}:{children:ReactNode}){
  const {products,loading:catalogLoading,error:catalogError}=useCatalog();
  const [favorites,setFavorites]=useState<string[]>([]);const [cart,setCart]=useState<CartItem[]>([]);const [user,setUser]=useState<User|null>(null);const [syncError,setSyncError]=useState('');const [cartOpen,setCartOpen]=useState(false);const [searchOpen,setSearchOpen]=useState(false);
  // Update this snapshot synchronously so batched clicks cannot reuse an old cart total.
  const currentCart=useRef(cart);
  function replaceCart(next:CartItem[]){currentCart.current=next;setCart(next);}
  const active=useRef<{id:string;cartId:string|null;variants:Map<string,string>;itemIds:Map<string,string>;epoch?:number;recovering?:boolean}|null>(null);
  const loaded=useRef(false);const generation=useRef(0);const queue=useRef(Promise.resolve());
  const firstFavoritesSave=useRef(true);const firstCartSave=useRef(true);
  function persist(task:()=>Promise<void>){const account=active.current;queue.current=queue.current.then(async()=>{if(account && active.current===account)await task();}).catch(()=>{setSyncError('Hesap verileriniz eşitlenemedi. Lütfen sayfayı yenileyip yeniden deneyin.');});}
  useEffect(()=>{
    const guest=guestData();setFavorites(guest.favorites);replaceCart(guest.cart);loaded.current=true;
    async function load(u:User|null){const stamp=++generation.current;
      if(!u){active.current=null;setUser(null);const data=guestData();setFavorites(data.favorites);replaceCart(data.cart);setSyncError('');return;}
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
        localStorage.removeItem('mc-favorites');localStorage.removeItem('mc-cart');active.current={id:u.id,cartId,variants,itemIds};setFavorites([...known]);replaceCart([...combined.values()]);setUser(u);setSyncError('');
      }catch{if(stamp===generation.current){setSyncError('Hesap verileriniz eşitlenemedi. Misafir verileriniz bu tarayıcıda korundu; lütfen tekrar deneyin.');setUser(u);}}
    }
    void supabase.auth.getUser().then(({data})=>{if(loaded.current)void load(data.user)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='USER_UPDATED'){setTimeout(()=>{void load(session?.user??null)},0)}});
    return ()=>{generation.current++;subscription.unsubscribe()};
  },[]);
  useEffect(()=>{if(firstFavoritesSave.current){firstFavoritesSave.current=false;return;}if(loaded.current&&!user&&!active.current)localStorage.setItem('mc-favorites',JSON.stringify(favorites))},[favorites,user]);
  useEffect(()=>{if(firstCartSave.current){firstCartSave.current=false;return;}if(loaded.current&&!user&&!active.current)localStorage.setItem('mc-cart',JSON.stringify(cart))},[cart,user]);
  function toggleFavorite(id:string){const existing=favorites.includes(id);setFavorites(current=>existing?current.filter(v=>v!==id):[...current,id]);const account=active.current;if(account)persist(async()=>{const {error}=existing?await supabase.from('favorites').delete().eq('user_id',account.id).eq('product_id',id):await supabase.from('favorites').upsert({user_id:account.id,product_id:id},{onConflict:'user_id,product_id'});if(error)throw error;});}
  function saveItem(item:CartItem,quantity:number){const account=active.current;if(!account)return;
    const epoch=account.epoch??0;
    queue.current=queue.current.then(async()=>{
    if(active.current!==account||account.recovering||(account.epoch??0)!==epoch)return;
    try {
    const id=account.itemIds.get(key(item));
    if(quantity===0){if(id){const {error}=await supabase.from('cart_items').delete().eq('id',id);if(error)throw error;account.itemIds.delete(key(item));}return;}
    const variant=account.variants.get(key(item));if(!variant)throw new Error('Bu varyant artık kullanılamıyor.');
    if(!account.cartId){const {data,error}=await supabase.from('carts').insert({user_id:account.id}).select('id').single();if(error)throw error;account.cartId=data.id;}
    if(id){const {error}=await supabase.from('cart_items').update({quantity}).eq('id',id);if(error)throw error;}else{const {data,error}=await supabase.from('cart_items').insert({cart_id:account.cartId!,variant_id:variant,quantity}).select('id').single();if(error)throw error;account.itemIds.set(key(item),data.id);}
    } catch {
      if(active.current!==account)return;
      account.epoch=epoch+1;account.recovering=true;
      setSyncError('Sepet değişikliği kaydedilemedi. Sepetiniz sunucuyla yeniden eşitleniyor.');
      try {
        if(!account.cartId){
          const {data,error}=await supabase.from('carts').select('id').eq('user_id',account.id).maybeSingle();
          if(error)throw error;
          if(active.current!==account)return;
          account.cartId=data?.id??null;
        }
        const {data,error}=account.cartId?await supabase.from('cart_items').select('id,variant_id,quantity').eq('cart_id',account.cartId):{data:[],error:null};
        if(error)throw error;
        if(active.current!==account)return;
        const byVariant=new Map([...account.variants].map(([key,id])=>[id,key]));
        const restored:CartItem[]=[];const ids=new Map<string,string>();
        for(const row of data??[]){
          const identity=byVariant.get(row.variant_id);
          if(!identity)throw new Error('Unknown variant');
          const [productId,size,...color]=identity.split(':');
          if(!productId||!size)throw new Error('Invalid variant identity');
          restored.push({productId,size:size as Size,color:color.join(':'),quantity:row.quantity});ids.set(identity,row.id);
        }
        account.itemIds=ids;replaceCart(restored);account.recovering=false;
        setSyncError('Son sepet değişiklikleri kaydedilemedi. Sunucudaki sepet geri yüklendi; lütfen işleminizi tekrar deneyin.');
      } catch {
        if(active.current===account)setSyncError('Sepet doğrulanamadı. Yeni değişiklik yapmadan önce lütfen sayfayı yenileyin.');
      }
    }
  });}
  function addToCart(productId:string,size:Size,color:string,quantity=1){
    if(active.current?.recovering)return 'Sepet doğrulanıyor. Lütfen sayfayı yenileyip tekrar deneyin.';
    if(!Number.isSafeInteger(quantity)||quantity<1)return cartQuantityMessage;
    const item={productId,size,color,quantity};
    const existing=currentCart.current.find(v=>key(v)===key(item));
    const next={...item,quantity:(existing?.quantity??0)+quantity};
    const error=cartQuantityError(products.find(p=>p.id===productId),next,{loading:catalogLoading,error:catalogError});
    if(error)return error;
    replaceCart(existing?currentCart.current.map(v=>key(v)===key(item)?next:v):[...currentCart.current,next]);
    saveItem(next,next.quantity);setCartOpen(true);return null;
  }
  function updateQuantity(productId:string,size:Size,color:string,quantity:number){
    if(active.current?.recovering)return 'Sepet doğrulanıyor. Lütfen sayfayı yenileyip tekrar deneyin.';
    const item={productId,size,color,quantity};
    const existing=currentCart.current.find(v=>key(v)===key(item));
    if(!existing)return 'Sepette bu ürün bulunamadı.';
    if(!Number.isSafeInteger(quantity)||quantity<1||(quantity>99&&quantity>existing.quantity))return cartQuantityMessage;
    if(quantity===existing.quantity)return null;
    // Decreasing an existing line is allowed even if stock is unavailable or below its quantity.
    if(quantity>existing.quantity){
      const error=cartQuantityError(products.find(p=>p.id===productId),item,{loading:catalogLoading,error:catalogError});
      if(error)return error;
    }
    replaceCart(currentCart.current.map(v=>key(v)===key(item)?item:v));
    saveItem(item,quantity);return null;
  }
  function removeFromCart(productId:string,size:Size,color:string){
    if(active.current?.recovering){setSyncError('Sepet doğrulanıyor. Lütfen sayfayı yenileyip tekrar deneyin.');return;}
    const item={productId,size,color,quantity:1};
    replaceCart(currentCart.current.filter(v=>key(v)!==key(item)));saveItem(item,0);
  }
  return <StoreContext.Provider value={{favorites,cart,user,syncError,toggleFavorite,addToCart,updateQuantity,removeFromCart,cartOpen,setCartOpen,searchOpen,setSearchOpen}}>{children}</StoreContext.Provider>;
}
export function useStore(){const value=useContext(StoreContext);if(!value)throw new Error('StoreProvider is missing');return value;}
