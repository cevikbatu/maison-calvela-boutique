import { createFileRoute } from '@tanstack/react-router';
import { InfoPage } from '@/components/store/info-page';
import { pageMeta } from '@/lib/page-meta';

export const Route = createFileRoute('/gizlilik')({
  head: () => pageMeta('Gizlilik', 'Maison Calvela gizlilik bilgilendirmesi.'),
  component: () => <InfoPage eyebrow="MAISON CALVELA" title="Gizlilik" paragraphs={['Bu tanıtım sürümünde hesap veya ödeme bilgisi toplanmamaktadır. Sepetiniz ve favorileriniz yalnızca kullandığınız tarayıcıda saklanır.', 'E-posta alanı şu anda kayıt oluşturmaz. Satış ve hesap hizmetleri açıldığında güncel gizlilik bilgileri bu sayfada paylaşılacaktır.']}/> ,
});