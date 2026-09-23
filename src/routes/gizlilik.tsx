import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '@/components/store/legal-page';
import { pageMeta } from '@/lib/page-meta';
export const Route=createFileRoute('/gizlilik')({head:()=>pageMeta('Gizlilik Politikası','Maison Calvela Gizlilik Politikası. Önizleme taslağı.'),component:()=> <LegalPage title='Gizlilik Politikası' sections={[
  {heading:'Hesabınız ve tercihleriniz',body:'E-posta ile doğrulanan hesap açılabilir. Hesap bilgileri, adresler, favoriler ve sepet yalnızca ilgili kullanıcıya erişilebilir olacak şekilde korunur; misafir favori ve sepeti bu tarayıcıda saklanır, girişte hesaba eklenir.'},
  {heading:'Ödemeler ve siparişler',body:'Bu önizlemede ödeme veya yeni sipariş oluşturma yoktur. Kart verileri saklanmaz. Sipariş geçmişi yalnızca gerçekten oluşturulmuş kayıtları gösterir.'},
  {heading:'Ölçüm ve çerezler',body:'Ürün ve sayfa görüntülemeleri kimlik, IP veya cihaz tanımlayıcısı kaydedilmeden temel iç analitik için sayılır. Zorunlu oturum ve misafir sepeti/favorileri dışında pazarlama/üçüncü taraf analitik çerezi kullanılmaz. Ayrıntılar Çerez Politikası taslağındadır.'},
  {heading:'Talepler ve güncellemeler',body:'Veri hakları başvuruları için resmi iletişim kanalı: Satışa geçmeden önce doldurulacak. Hukuki metinler satış öncesinde gözden geçirilecektir.'},
]}/>});
