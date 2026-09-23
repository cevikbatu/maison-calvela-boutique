import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '@/components/store/legal-page';
import { pageMeta } from '@/lib/page-meta';
export const Route=createFileRoute('/on-bilgilendirme')({head:()=>pageMeta('Ön Bilgilendirme Formu Taslağı','Maison Calvela Ön Bilgilendirme Formu Taslağı. Önizleme taslağı.'),component:()=> <LegalPage title='Ön Bilgilendirme Formu Taslağı' sections={[
  {heading:'Satıcı ve iletişim',body:'Satıcı unvanı, MERSİS/VKN, açık adres, telefon ve resmi e-posta: Satışa geçmeden önce doldurulacak.'},
  {heading:'Sipariş öncesi bilgiler',body:'Ürün adı ve temel özellikleri, vergiler dahil toplam bedel, varsa teslimat masrafı, ödeme yöntemi, teslim süresi ve ifa şartları gerçek satış başlamadan önce açıkça sunulacak. Şu anda checkout yoktur.'},
  {heading:'Cayma ve iade',body:'Genel kural olarak teslimden itibaren 14 günlük cayma hakkı ve kanuni istisnalar hakkında siparişten önce bilgi verilecek. Cayma bildirimi yöntemi ve iade adresi: Satışa geçmeden önce doldurulacak.'},
  {heading:'Onay',body:'Ön bilgilendirmenin tüketiciye işlemden önce sağlanması ve mevzuata uygun onay akışı satış altyapısı açılmadan önce tamamlanacak; önizleme herhangi bir onay veya satış kaydı oluşturmaz.'},
]}/>});
