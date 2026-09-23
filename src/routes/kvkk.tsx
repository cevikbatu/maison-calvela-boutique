import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '@/components/store/legal-page';
import { pageMeta } from '@/lib/page-meta';
export const Route=createFileRoute('/kvkk')({head:()=>pageMeta('KVKK Aydınlatma Metni','Maison Calvela KVKK Aydınlatma Metni. Önizleme taslağı.'),component:()=> <LegalPage title='KVKK Aydınlatma Metni' sections={[
  {heading:'Veri sorumlusu',body:'Maison Calvela markasının veri sorumlusu olan tüzel kişinin ticaret unvanı, iletişim bilgileri, MERSİS/VKN ve adresi: Satışa geçmeden önce doldurulacak.'},
  {heading:'İşlenen veriler ve amaçlar',body:'Hesap için e-posta, şifreyi yöneten kimlik doğrulama hizmeti, ad-soyad, kullanıcı tarafından eklenen adresler, favoriler, sepet ve gerçek sipariş kayıtları; hesap hizmeti, güvenlik, talep yönetimi ve yasal yükümlülükler için işlenebilir. Şifreler uygulama veritabanında düz metin olarak tutulmaz. Ürün/sayfa görüntülemeleri kimlik veya cihaz tanımlayıcısı olmadan toplulaştırılmış içgörü için kaydedilir.'},
  {heading:'Toplama yöntemi ve hukuki sebep',body:'Bilgiler üyelik ve profil formlarından, hizmet kullanımı sırasında elektronik ortamda alınır. İşleme sebepleri hizmet sözleşmesinin kurulması/ifası, hukuki yükümlülük, meşru menfaat ve gerektiğinde ayrı açık rızadır. Pazarlama rızası üyelik şartı değildir.'},
  {heading:'Aktarım ve saklama',body:'Kimlik doğrulama, barındırma ve veritabanı altyapısı hizmet sağlayıcısı Supabase/Lovable Cloud aracılığıyla sunulur. Yurt dışına aktarım, alıcı grupları ve veri saklama süreleri somut hizmet düzeni kesinleştiğinde hukuk uzmanı incelemesiyle detaylandırılacak: Satışa geçmeden önce doldurulacak.'},
  {heading:'İlgili kişinin hakları',body:'KVKK madde 11 kapsamındaki bilgi alma, düzeltme, silme, itiraz ve diğer haklara ilişkin başvurular için başvuru adresi ve yöntemi: Satışa geçmeden önce doldurulacak. İletişim sayfasından taslak iletişim bilgilerine ulaşabilirsiniz.'},
]}/>});
