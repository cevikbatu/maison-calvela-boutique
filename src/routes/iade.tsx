import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '@/components/store/legal-page';
import { pageMeta } from '@/lib/page-meta';
export const Route=createFileRoute('/iade')({head:()=>pageMeta('İade / Cayma / Değişim','Maison Calvela İade / Cayma / Değişim. Önizleme taslağı.'),component:()=> <LegalPage title='İade / Cayma / Değişim' sections={[
  {heading:'14 günlük cayma hakkı',body:'Türkiye’de mesafeli satış çerçevesinde tüketici, kural olarak malın tesliminden itibaren 14 gün içinde gerekçe göstermeksizin cayma hakkını kullanabilir. Bazı ürün ve durumlar mevzuattaki istisnalara tabi olabilir; somut şartlar satış öncesi açıklanacak.'},
  {heading:'Bildirim ve geri gönderim',body:'Cayma bildirim yöntemi, resmi iletişim adresi, iade gönderim adresi ve iade gönderim masraflarının hangi koşullarda karşılanacağı: Satışa geçmeden önce doldurulacak. Kanuni süreler ve haklar nihai politikada korunacaktır.'},
  {heading:'Değişim ve ücret iadesi',body:'Değişim koşulları, varsa alternatif beden/renk uygunluğu ve ücret iadesi yöntemi gerçek satıştan önce kesinleşecek. Bu önizlemede ödeme ve sipariş işlemi yoktur.'},
]}/>});
