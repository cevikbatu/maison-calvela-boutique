import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { pageMeta } from '@/lib/page-meta';

export const Route = createFileRoute('/iletisim')({
  head: () => pageMeta('İletişim', 'Maison Calvela iletişim bilgileri ve müşteri desteği.'),
  component: ContactPage,
});

function ContactPage() {
  return <main className="container-wide min-h-[60vh] py-16 md:py-24"><p className="label-caps text-gold">MAISON CALVELA / İLETİŞİM</p><h1 className="editorial-title mt-5 text-6xl md:text-[84px]">İletişim</h1><div className="mt-12 max-w-xl border-t border-border pt-8"><h2 className="font-display text-3xl">Sizinle buluşmayı bekliyoruz.</h2><p className="mt-4 text-sm leading-relaxed text-muted-foreground">İletişim kanalımız hazırlık aşamasında. Sipariş ve müşteri desteği henüz aktif değil; güncel bilgiler burada paylaşılacak.</p><Button variant="luxuryOutline" className="mt-8" asChild><Link to="/koleksiyon">Koleksiyonu Keşfet</Link></Button></div></main>;
}