import { Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { Product } from '@/data/catalog';
import { MeasurementTable } from './measurement-table';

export function SizeGuide({product,open,onOpenChange}:{product:Product;open:boolean;onOpenChange:(open:boolean)=>void}){
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="right" className="w-[min(540px,100vw)] overflow-y-auto bg-background p-6 sm:max-w-[540px] md:p-10"><SheetHeader className="text-left"><Ruler size={25} strokeWidth={1}/><SheetTitle className="editorial-title mt-5 text-5xl font-normal">Beden Rehberi</SheetTitle><SheetDescription>{product.name}</SheetDescription></SheetHeader>
    {(product.modelHeight||product.modelSize)&&<div className="mt-8 space-y-2 border-y border-border py-5 text-sm text-ink-soft">{product.modelHeight&&<p>Model boyu: {product.modelHeight}</p>}{product.modelSize&&<p>Modelin giydiği beden: {product.modelSize}</p>}</div>}
    <MeasurementTable product={product}/>
    <div className="mt-10 border-t border-border pt-7"><h3 className="font-display text-3xl">Nasıl ölçülür?</h3><div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground"><p>Sevdiğiniz bir üst parçayı düz bir yüzeye serin. Yumuşak bir mezura ile ölçün; kumaşı germeyin.</p><p><strong className="text-foreground">Göğüs</strong> · Kol altından kol altına düz genişlik. <strong className="text-foreground">Omuz</strong> · İki omuz dikişi arası. <strong className="text-foreground">Bel</strong> · Bel hizasında düz genişlik.</p><p><strong className="text-foreground">Ürün boyu</strong> · Omuzun en yüksek noktasından etek ucuna. <strong className="text-foreground">Kol boyu</strong> · Omuz dikişinden manşet ucuna.</p></div></div><Button variant="luxuryOutline" className="mt-8 w-full" onClick={()=>onOpenChange(false)}>Kapat</Button></SheetContent></Sheet>;
}