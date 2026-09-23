import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { categories, products, type CategorySlug, type Gender } from '@/data/catalog';
import { ProductGrid } from './product-card';

type Props={title:string;eyebrow?:string;intro?:string;gender?:Gender;category?:CategorySlug;newOnly?:boolean;query?:string};
export function CatalogPage({title,eyebrow='KOLEKSİYON',intro,gender,category,newOnly=false,query}:Props){
  const [chosenCategory,setChosenCategory]=useState<CategorySlug | 'all'>(category??'all');
  const [chosenSize,setChosenSize]=useState('all');
  const [maxPrice,setMaxPrice]=useState('all');
  const [sort,setSort]=useState('featured');
  const [filtersOpen,setFiltersOpen]=useState(false);
  const filtered=useMemo(()=>{
    let list=products.filter(p=>p.visible && (!gender||p.gender===gender) && (!newOnly||p.newArrival) && (chosenCategory==='all'||p.category===chosenCategory) && (chosenSize==='all'||p.sizes.includes(chosenSize as 'S')) && (maxPrice==='all'||p.price<=Number(maxPrice)) && (!query||`${p.name} ${p.description} ${p.category} ${p.gender}`.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))));
    if(sort==='low')list=[...list].sort((a,b)=>a.price-b.price);
    if(sort==='high')list=[...list].sort((a,b)=>b.price-a.price);
    if(sort==='name')list=[...list].sort((a,b)=>a.name.localeCompare(b.name,'tr'));
    return list;
  },[gender,newOnly,chosenCategory,chosenSize,maxPrice,sort,query]);
  return <main className="container-wide pb-24"><div className="pt-10 md:pt-16"><p className="label-caps text-gold">{eyebrow}</p><h1 className="editorial-title mt-3 text-[52px] sm:text-[72px] lg:text-[90px]">{title}</h1><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">{intro??'Günlük stilinize kalıcı bir zarafet katan, özenle seçilmiş parçalar.'}</p></div>
    {gender&&<div className="mt-9 flex flex-wrap gap-5 border-b border-border pb-4 text-xs font-medium uppercase tracking-[.11em] md:mt-12">{[{slug:'all',name:'Tümü'},...categories].map(c=><Button key={c.slug} variant="ghost" size="sm" onClick={()=>setChosenCategory(c.slug as CategorySlug|'all')} className={`h-auto px-0 py-1 rounded-none hover:bg-transparent ${chosenCategory===c.slug?'border-b border-foreground text-foreground':'text-muted-foreground'}`}>{c.name}</Button>)}</div>}
    <div className={`flex flex-wrap items-center justify-between gap-4 border-b border-border py-5 ${gender?'':'mt-10'}`}><span className="text-xs text-muted-foreground">{filtered.length} ürün</span><div className="flex items-center gap-3 sm:gap-6"><Button variant="ghost" size="sm" onClick={()=>setFiltersOpen(v=>!v)} aria-expanded={filtersOpen} className="gap-2 text-xs"><SlidersHorizontal size={16}/> Filtrele {filtersOpen&&<X size={13}/>}</Button><label className="flex items-center gap-2 text-xs"><span className="hidden sm:inline">Sırala:</span><select aria-label="Sırala" value={sort} onChange={e=>setSort(e.target.value)} className="max-w-[148px] bg-background font-medium outline-none"><option value="featured">Önerilen</option><option value="low">Fiyat: Artan</option><option value="high">Fiyat: Azalan</option><option value="name">İsme Göre</option></select></label></div></div>
    {filtersOpen&&<div className="flex flex-wrap gap-5 border-b border-border bg-panel px-5 py-5 text-sm"><label className="flex items-center gap-3">Beden<select aria-label="Beden filtresi" value={chosenSize} onChange={e=>setChosenSize(e.target.value)} className="border border-border bg-background px-3 py-2"><option value="all">Tümü</option>{['XS','S','M','L','XL'].map(s=><option key={s}>{s}</option>)}</select></label><label className="flex items-center gap-3">Fiyat<select aria-label="Fiyat filtresi" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} className="border border-border bg-background px-3 py-2"><option value="all">Tümü</option><option value="2000">2.000 ₺ altı</option><option value="2500">2.500 ₺ altı</option><option value="3000">3.000 ₺ altı</option></select></label>{!gender&&<label className="flex items-center gap-3">Kategori<select aria-label="Kategori filtresi" value={chosenCategory} onChange={e=>setChosenCategory(e.target.value as CategorySlug|'all')} className="border border-border bg-background px-3 py-2"><option value="all">Tümü</option>{categories.map(c=><option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label>}<Button variant="link" size="sm" onClick={()=>{setChosenSize('all');setMaxPrice('all');setChosenCategory(category??'all')}}>Temizle</Button></div>}
    <div className="mt-7">{filtered.length?<ProductGrid items={filtered}/>:<div className="py-24 text-center"><p className="font-display text-3xl">Aradığınız parçayı bulamadık.</p><p className="mt-3 text-sm text-muted-foreground">Filtreleri değiştirmeyi deneyin.</p><Button asChild variant="luxuryOutline" className="mt-6"><Link to="/koleksiyon">Tüm Koleksiyon</Link></Button></div>}</div>
  </main>;
}
