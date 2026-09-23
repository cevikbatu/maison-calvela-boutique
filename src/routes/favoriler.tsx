import { createFileRoute, Link } from '@tanstack/react-router';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/store/product-card';
import { useStore } from '@/components/store/store-provider';
import { products } from '@/data/catalog';
import { pageMeta } from '@/lib/page-meta';

export const Route = createFileRoute('/favoriler')({
  head: () => pageMeta('Favorilerim', 'Maison Calvela favori parçalarınız.'),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { favorites } = useStore();
  const items = products.filter(product => product.visible && favorites.includes(product.id));
  return <main className="container-wide min-h-[55vh] py-12 md:py-20">
    <p className="label-caps text-gold">MAISON CALVELA</p>
    <h1 className="editorial-title mt-4 text-6xl md:text-7xl">Favorilerim</h1>
    <p className="mt-5 text-sm text-muted-foreground">Beğendiğiniz parçalar bir arada.</p>
    {items.length ? <div className="mt-12"><ProductGrid items={items}/></div> : <div className="flex flex-col items-center py-20 text-center"><Heart size={36} strokeWidth={1}/><h2 className="font-display mt-5 text-3xl">Henüz favori parçanız yok.</h2><p className="mt-2 text-sm text-muted-foreground">Sizi yansıtan parçaları keşfedin.</p><Button asChild variant="luxuryOutline" className="mt-7"><Link to="/koleksiyon">Koleksiyonu Keşfet</Link></Button></div>}
  </main>;
}