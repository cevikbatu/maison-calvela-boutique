import { createFileRoute, Link } from '@tanstack/react-router';
import { UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pageMeta } from '@/lib/page-meta';

export const Route = createFileRoute('/profil')({
  head: () => pageMeta('Profil', 'Maison Calvela profil ve hesap bilgileri.'),
  component: ProfilePage,
});

function ProfilePage() {
  return <main className="container-wide flex min-h-[55vh] flex-col items-center justify-center py-20 text-center">
    <UserRound size={36} strokeWidth={1}/>
    <p className="label-caps mt-7 text-gold">MAISON CALVELA</p>
    <h1 className="editorial-title mt-4 text-6xl">Profil</h1>
    <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">Hesap oluşturma ve giriş henüz açık değil. Favorileriniz ve sepetiniz bu tarayıcıda saklanır.</p>
    <Button variant="luxuryOutline" className="mt-8" asChild><Link to="/koleksiyon">Koleksiyonu Keşfet</Link></Button>
  </main>;
}