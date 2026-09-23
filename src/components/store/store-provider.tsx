import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CartItem, Size } from '@/data/catalog';

type StoreContextValue = {
  favorites: string[]; cart: CartItem[];
  toggleFavorite: (id:string)=>void;
  addToCart: (productId:string,size:Size,color:string,quantity?:number)=>void;
  updateQuantity: (productId:string,size:Size,color:string,quantity:number)=>void;
  removeFromCart: (productId:string,size:Size,color:string)=>void;
  cartOpen: boolean; setCartOpen: (open:boolean)=>void;
  searchOpen: boolean; setSearchOpen: (open:boolean)=>void;
};
const StoreContext = createContext<StoreContextValue | null>(null);
export function StoreProvider({children}:{children:ReactNode}) {
  const [favorites,setFavorites] = useState<string[]>([]);
  const [cart,setCart] = useState<CartItem[]>([]);
  const [cartOpen,setCartOpen] = useState(false);
  const [searchOpen,setSearchOpen] = useState(false);
  const [ready,setReady] = useState(false);
  useEffect(()=>{
    try {
      const savedFavorites = JSON.parse(localStorage.getItem('mc-favorites') || '[]');
      const savedCart = JSON.parse(localStorage.getItem('mc-cart') || '[]');
      if(Array.isArray(savedFavorites)) setFavorites(savedFavorites);
      if(Array.isArray(savedCart)) setCart(savedCart);
    } catch { /* Ignore invalid demo browser data. */ }
    setReady(true);
  },[]);
  useEffect(()=>{ if(ready) localStorage.setItem('mc-favorites',JSON.stringify(favorites)); },[favorites,ready]);
  useEffect(()=>{ if(ready) localStorage.setItem('mc-cart',JSON.stringify(cart)); },[cart,ready]);
  const toggleFavorite = (id:string)=>setFavorites(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  const addToCart = (productId:string,size:Size,color:string,quantity=1)=>{
    setCart(current=>{
      const index=current.findIndex(item=>item.productId===productId && item.size===size && item.color===color);
      if(index===-1) return [...current,{productId,size,color,quantity}];
      return current.map((item,i)=>i===index?{...item,quantity:item.quantity+quantity}:item);
    });
    setCartOpen(true);
  };
  const updateQuantity=(productId:string,size:Size,color:string,quantity:number)=>setCart(current=>current.map(item=>item.productId===productId&&item.size===size&&item.color===color?{...item,quantity:Math.max(1,quantity)}:item));
  const removeFromCart=(productId:string,size:Size,color:string)=>setCart(current=>current.filter(item=>!(item.productId===productId&&item.size===size&&item.color===color)));
  return <StoreContext.Provider value={{favorites,cart,toggleFavorite,addToCart,updateQuantity,removeFromCart,cartOpen,setCartOpen,searchOpen,setSearchOpen}}>{children}</StoreContext.Provider>;
}
export function useStore() { const value=useContext(StoreContext); if(!value) throw new Error('StoreProvider is missing'); return value; }
