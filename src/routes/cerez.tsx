import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '@/components/store/legal-page';
import { pageMeta } from '@/lib/page-meta';
export const Route=createFileRoute('/cerez')({head:()=>pageMeta('Çerez Politikası','Maison Calvela Çerez Politikası. Önizleme taslağı.'),component:()=> <LegalPage title='Çerez Politikası' sections={[
  {heading:'Şu anda kullanılan teknolojiler',body:'Hesap oturumu için gerekli yerel saklama; misafir sepeti ve favorileri için tarayıcı yerel saklaması kullanılır. Oturum doğrulaması ve temel güvenlik amaçlı zorunlu teknolojiler hizmetin çalışması için gereklidir.'},
  {heading:'Analitik ve pazarlama tercihleri',body:'Üçüncü taraf analitik/pazarlama çerezleri şu anda kullanılmıyor. Ürün/sayfa görüntülemesi veritabanına kimliksiz, temel sayaç olayı olarak yazılır; çerez tabanlı takip içermez. Gelecekte isteğe bağlı çerez eklenirse varsayılan kapalı olacak; kullanılmadan önce ayrı bir tercih merkezi ve açık onay sunulacak. Bu önizlemede var olmayan çerezler için “kabul edildi” durumu oluşturulmaz.'},
  {heading:'Kontrol',body:'Tarayıcınızın yerel veri ayarlarından misafir sepeti/favorileri silebilirsiniz. Oturumdan çıkış yaparak hesaptan ayrılabilirsiniz. Çerez kategorileri değişirse bu metin ve tercih merkezi güncellenecek.'},
]}/>});
