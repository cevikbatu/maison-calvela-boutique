import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '@/components/store/legal-page';
import { pageMeta } from '@/lib/page-meta';
export const Route=createFileRoute('/teslimat')({head:()=>pageMeta('Teslimat','Maison Calvela Teslimat. Önizleme taslağı.'),component:()=> <LegalPage title='Teslimat' sections={[
  {heading:'Planlanan hizmet yönü',body:'Ücretsiz standart gönderim bir planlamadır; satışa hazır, bağlayıcı bir hizmet ilanı değildir. Teslimat hizmeti ve nihai koşullar ürünler ve lojistik düzeni kesinleştiğinde açıklanacak.'},
  {heading:'Gönderim bilgileri',body:'Taşıyıcı firma, gönderim bölgesi, tahmini teslim süresi, teslimat ücretleri ve olası kısıtlar: Satışa geçmeden önce doldurulacak. Bu önizlemede ödeme ve sipariş alınmıyor.'},
  {heading:'Paketleme',body:'Maison Calvela özenli paketleme için görsel konsept geliştirmektedir. Nihai ambalaj ürünler geldiğinde kesinleşecek; paketleme taslağı gerçek gönderim vaadi değildir.'},
]}/>});
