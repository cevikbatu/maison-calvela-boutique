import { Link } from '@tanstack/react-router';
import { Heart, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatPrice, type Product, type Size } from '@/data/catalog';
import { useStore } from './store-provider';

export function ProductCard({product}:{product:Product}) {
  const {favorites,toggleFavorite,addToCart}=useStore();
  const [quickOpen,setQuickOpen]=useState(false);
  const [size,setSize]=useState<Size | null>(null);
   const [color,setColor]=useState(product.colors[0]?.name??'');
  return <article className="group min-w-0">
    <div className="relative overflow-hidden image-soft">
      <Link to="/urun/$slug" params={{slug:product.slug}} className="block aspect-[3/4] overflow-hidden" aria-label={`${product.name} ürününü incele`}>
        <img src={product.images[0]} alt={`${product.name} model üzerinde`} loading="lazy" width={500} height={750} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"/>
      </Link>
      {product.newArrival&&<span className="absolute left-3 top-3 bg-background px-2.5 py-1.5 label-caps text-foreground">YENİ</span>}
      <Button variant="ghost" size="icon" aria-label={favorites.includes(product.id)?`${product.name} favorilerden çıkar`:`${product.name} favorilere ekle`} title="Favorilere ekle" onClick={()=>toggleFavorite(product.id)} className="absolute right-2 top-2 bg-background/90 hover:bg-background"><Heart className={favorites.includes(product.id)?'fill-gold text-gold':'text-foreground'}/></Button>
      <Button variant="luxury" onClick={()=>setQuickOpen(true)} className="absolute bottom-0 left-0 w-full rounded-none opacity-100 md:translate-y-full md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300"><Plus/> Hızlı İncele</Button>
    </div>
    <div className="pt-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><p className="label-caps text-gold">MAISON CALVELA</p><Link to="/urun/$slug" params={{slug:product.slug}} className="mt-1 block text-sm font-medium hover:underline underline-offset-4">{product.name}</Link></div>
        <p className="shrink-0 text-sm font-medium">{formatPrice(product.salePrice??product.price)}</p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{product.gender==='kadin'?'Kadın':'Erkek'} / {product.category==='tshirt'?'T-shirt':product.category==='polo'?'Polo Yaka':'Uzun Kollu'}</p>
      <div className="mt-3 flex gap-2" aria-label="Renk seçenekleri">{product.colors.map(c=><span key={c.name} title={c.name} className={`h-3.5 w-3.5 rounded-full border border-border swatch-${c.token}`}/>)}</div>
    </div>
    <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
      <DialogContent className="max-w-[min(900px,94vw)] border-border p-0 sm:rounded-none overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="grid md:grid-cols-2"><img src={product.images[0]} alt={product.name} className="h-72 w-full object-cover object-top md:h-full"/><div className="p-6 md:p-10 flex flex-col justify-center"><p className="label-caps text-gold">MAISON CALVELA / {product.gender==='kadin'?'KADIN':'ERKEK'}</p><DialogTitle className="editorial-title mt-4 text-4xl font-normal">{product.name}</DialogTitle><p className="mt-4 text-lg">{formatPrice(product.price)}</p><DialogDescription className="mt-5 leading-relaxed">{product.description}</DialogDescription>
          <p className="label-caps mt-7">RENK: {color}</p><div className="mt-3 flex gap-2">{product.colors.map(c=><Button key={c.name} type="button" variant={color===c.name?'default':'outline'} size="sm" onClick={()=>setColor(c.name)}>{c.name}</Button>)}</div>
          <p className="label-caps mt-7">BEDEN</p><div className="mt-3 flex gap-2">{product.sizes.map(s=><Button key={s} type="button" variant={size===s?'default':'outline'} size="icon" onClick={()=>setSize(s)}>{s}</Button>)}</div>
          <Button variant="luxury" size="lg" className="mt-8" onClick={()=>{if(size){addToCart(product.id,size,color);setQuickOpen(false)}}}>{size?'Sepete Ekle':'Önce Beden Seçin'}</Button><Link to="/urun/$slug" params={{slug:product.slug}} onClick={()=>setQuickOpen(false)} className="mt-4 text-center text-xs underline underline-offset-4">Ürün detaylarını gör</Link>
        </div></div>
      </DialogContent>
    </Dialog>
  </article>;
}
export function ProductGrid({items}:{items:Product[]}) { return <div className="grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 lg:grid-cols-4 lg:gap-x-6">{items.map(product=><ProductCard key={product.id} product={product}/>)}</div>; }
