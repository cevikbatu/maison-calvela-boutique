import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '@/components/store/legal-page';
import { pageMeta } from '@/lib/page-meta';
export const Route=createFileRoute('/mesafeli-satis')({head:()=>pageMeta('Mesafeli Satış Sözleşmesi Taslağı','Maison Calvela Mesafeli Satış Sözleşmesi Taslağı. Önizleme taslağı.'),component:()=> <LegalPage title='Mesafeli Satış Sözleşmesi Taslağı' sections={[
  {heading:'Taraflar ve satıcı',body:'Satıcının ticaret unvanı, MERSİS/VKN, açık adresi, telefon ve resmi e-postası: Satışa geçmeden önce doldurulacak. Alıcının sipariş anında verdiği bilgiler sözleşmede yer alacaktır.'},
  {heading:'Ürün ve bedel',body:'Ürünün esaslı nitelikleri, satış bedeli, vergiler ve ek masraflar her bir gerçek siparişten önce ayrı ve açık biçimde gösterilmelidir. Bu önizlemede kamuya açık fiyat yoktur ve sipariş alınmaz.'},
  {heading:'Ödeme, teslimat, ifa',body:'Ödeme yöntemleri, kargo sağlayıcısı, teslimat süresi, masraflar ve ifa şartları: Satışa geçmeden önce doldurulacak. Şu anda ödeme sistemi kapalıdır; hiçbir işlem başarılı satış olarak gösterilmez.'},
  {heading:'Cayma hakkı ve istisnalar',body:'Mesafeli satış mevzuatı çerçevesinde tüketici genel olarak teslimden itibaren 14 gün içinde gerekçe göstermeksizin cayma hakkını kullanabilir. Mevzuatta öngörülen istisnalar ve somut sipariş koşulları satış öncesinde ayrıca açıklanmalıdır. İade yöntemi ve iletişim kanalı: Satışa geçmeden önce doldurulacak.'},
  {heading:'Uyuşmazlık',body:'Tüketici hakem heyetleri ve tüketici mahkemeleri için yürürlükteki mevzuat ve parasal sınırlar esas alınır. Nihai metin bir hukuk uzmanı tarafından düzenlenecektir.'},
]}/>});
