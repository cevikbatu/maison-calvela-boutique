import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '@/components/store/legal-page';
import { pageMeta } from '@/lib/page-meta';
export const Route=createFileRoute('/ticari-ileti')({head:()=>pageMeta('Ticari Elektronik İleti ve Pazarlama İzni','Maison Calvela Ticari Elektronik İleti ve Pazarlama İzni. Önizleme taslağı.'),component:()=> <LegalPage title='Ticari Elektronik İleti ve Pazarlama İzni' sections={[
  {heading:'Hizmet ve pazarlama ayrımı',body:'Hesap açmak, favori ve sepet saklamak için pazarlama izni zorunlu değildir. Hizmete ilişkin zorunlu hesap ve güvenlik bildirimleri pazarlama izninden ayrı değerlendirilir.'},
  {heading:'İsteğe bağlı onay',body:'Koleksiyon haberleri için hesap merkezinde ayrı bir onay kutusu bulunur; varsayılan olarak işaretli değildir ve geri çekilebilir. Henüz pazarlama iletisi gönderimi yoktur. Bülten alanı önizlemede kayıt almaz.'},
  {heading:'İYS ve iletişim',body:'İYS entegrasyonu ve ticari iletilere ilişkin nihai iletişim/yönetim kanalları satış öncesi tamamlanacak. Resmi iletişim: Satışa geçmeden önce doldurulacak.'},
]}/>});
