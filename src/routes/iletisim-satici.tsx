import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '@/components/store/legal-page';
import { pageMeta } from '@/lib/page-meta';
export const Route=createFileRoute('/iletisim-satici')({head:()=>pageMeta('İletişim ve Satıcı Bilgileri','Maison Calvela İletişim ve Satıcı Bilgileri. Önizleme taslağı.'),component:()=> <LegalPage title='İletişim ve Satıcı Bilgileri' sections={[
  {heading:'Satıcı bilgileri',body:'Ticaret unvanı: Satışa geçmeden önce doldurulacak.\nMERSİS / VKN: Satışa geçmeden önce doldurulacak.\nAçık adres: Satışa geçmeden önce doldurulacak.'},
  {heading:'İletişim kanalları',body:'Resmi e-posta: Satışa geçmeden önce doldurulacak.\nTelefon: Satışa geçmeden önce doldurulacak.\nMüşteri hizmetleri ve KVKK başvuruları için iletişim yöntemi: Satışa geçmeden önce doldurulacak.'},
  {heading:'Önizleme durumu',body:'Bu sayfa taslaktır; gerçek iletişim ve satıcı bilgileri doğrulanıp tamamlanana kadar sipariş ve ödeme işlemi açılamaz.'},
]}/>});
