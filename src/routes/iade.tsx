import { createFileRoute } from '@tanstack/react-router';
import { InfoPage } from '@/components/store/info-page';
import { pageMeta } from '@/lib/page-meta';

export const Route = createFileRoute('/iade')({
  head: () => pageMeta('İade', 'Maison Calvela iade ve değişim bilgileri.'),
  component: () => <InfoPage eyebrow="ALIŞVERİŞ REHBERİ" title="İade & Değişim" paragraphs={['Bu tanıtım sürümünde satış yapılmamaktadır. İade ve değişim koşulları alışveriş açılmadan önce burada açıkça paylaşılacaktır.']}/> ,
});