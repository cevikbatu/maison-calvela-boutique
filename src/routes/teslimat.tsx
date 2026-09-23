import { createFileRoute } from '@tanstack/react-router';
import { InfoPage } from '@/components/store/info-page';
import { pageMeta } from '@/lib/page-meta';

export const Route = createFileRoute('/teslimat')({
  head: () => pageMeta('Teslimat', 'Maison Calvela teslimat bilgileri.'),
  component: () => <InfoPage eyebrow="ALIŞVERİŞ REHBERİ" title="Teslimat" paragraphs={['Bu tanıtım sürümünde sipariş ve ödeme alınmamaktadır. Teslimat seçenekleri, ücretleri ve süreleri satışa başlamadan önce burada duyurulacaktır.']}/> ,
});