# Yerel geliştirme ve canlıya geçiş sınırı

Bu çalışma `gelistirme` üzerindedir. Push, merge, DNS değişikliği, deployment, ödeme ve gerçek e-posta gönderimi yapılmamıştır. Canlı Supabase'e migration veya veri yazımı yapılmamıştır.

## Uygulanmamış migration dosyaları

| Dosya | Etki | Risk / geri dönüş |
| --- | --- | --- |
| `20260930170024_customer_default_address.sql` | Kullanıcı başına bir varsayılan adres; sahiplik composite foreign key ve RLS ile korunur. | Mevcut adresleri değiştirmez. Geri dönüşte yeni UI kapatılır; oluşmuş seçim kayıtlarını yedeklemeden tablo silinmez. |
| `20260930170543_customer_service_requests.sql` | Başvuru, geçmiş, özel e-posta kuyruğu, private fotoğraf bucket/policy ve admin karar RPC'leri. Siparişe boş teslim tarihi alanı ekler. | Geçmiş teslim tarihlerini tahmin etmez. Canlıda var olan bucket/policy çakışmaları önce incelenmelidir. Geri dönüşte yazım kapatılır; başvuru/audit/fotoğraf verileri korunur, kör DROP yapılmaz. |
| `20260930173000_guest_cart_merge.sql` | İdempotent makbuz ve stokla sınırlı merge RPC. | Normal sepet yazımlarıyla çok bağlantılı yarış testi tamamlanmalı. Geri dönüşte önce istemci merge çağrısı kapatılır; belirsiz sonuçlu makbuzlar ve misafir kayıtları korunur. |
| `20260930180000_public_product_prices.sql` | Yayımlanmış ürünlerin satış fiyatına salt okunur erişim. | Yalnız perakende fiyat tablosu varsayılır; canlı şema kontrolü gerekir. Geri dönüşte bu okuma policy/grant'i önceki yetki durumuna döndürülür; fiyat verisi silinmez. |

`secure-owner-self-claim.sql` yalnız alternatif taslaktır; migration dizininde değildir ve bu yayın kapsamına alınmamalıdır. Mevcut admin/owner doğrulaması korunur.

## Yerel doğrulamanın sınırları

Testlerdeki DB, ağ bağlantısı olmayan geçici PGlite PostgreSQL motorudur. `MC_PGLITE_MODULE` bu geçici kurulumun yoluna işaret eder. Bu değişken yoksa DB testleri skip edilir. Bu ortam tek bağlantılıdır; canlı Supabase, Storage servisi, PostgREST JWT aktarımı veya çok bağlantılı transaction yarışı doğrulanmış sayılmaz.

Tarayıcı testleri geçici uygulama kopyası ve mock API/istemci ile yapılmıştır. Ana projedeki Supabase istemcisi değiştirilmez. Adres ekleme/düzenleme/varsayılan seçim, sebepsiz/fotoğrafsız iade başvurusu ve admin listesinde görünmesi kontrol edilmiştir. Ürün sayfası 375/768/1440 genişliklerde yatay taşma göstermemiştir.

Başvuru görsellerinde UI başına 3 dosya ve dosya başına 5 MB sınırı vardır; storage bucket dosya boyutu ve MIME türünü sınırlar. İstek başına toplam kotanın sunucu tarafında uygulanması, dosya içerik taraması ve operasyonel hız sınırı yayına hazırlıkta ayrıca değerlendirilmelidir. Başvuru numarası UUID'dir. Form tekrar denemesi aynı açık formdaki kimliği korur; tarayıcı kapanması sonrasında yeni form yeni başvuru olabilir.

E-posta kuyruğunda gönderim kapalıdır; provider, sender, worker veya ağ gönderimi yoktur. Şablonlar düz metin önizlemedir. Teslim tarihi yoksa başvuru incelemeye alınır. Kanuni iade/kusurlu ürün talepleri bu modülde reddedilemez; gönüllü değişim reddinde açıklama zorunludur.

## calvela.com hazırlığı

- Domain kesinleşince `VITE_PUBLIC_SITE_URL` HTTPS origin olarak tanımlanır; şu anda environment değerleri değiştirilmedi. Robots/sitemap/canonical mevcut yapı üzerinden bu değeri kullanır.
- İlk sahip daveti gerekiyorsa sunucudaki `OWNER_BOOTSTRAP_ALLOWED_ORIGINS` değerine yalnız onaylanmış tam originler yazılır. `SUPABASE_SERVICE_ROLE_KEY` sadece server secret olarak kalır.
- Supabase Auth site URL/redirect allowlist, HTTPS ve production cookie/oturum davranışı ayrı onaylı hazırlıkta kontrol edilmeli. DNS veya Auth paneli bu görevde değiştirilmedi.
- `.env` mevcut Git geçmişinde izleniyor. Değerleri değiştirilmedi/raporlanmadı. Yeni secretlar bu dosyaya yazılmamalı; yerelde zaten ignore edilen `.env.local`, canlıda hosting secret alanı kullanılmalı. `.env` dosyasını Git takibinden çıkarma ve varsa geçmiş secret denetimi ayrı, kontrollü işlem olarak yapılmalı.
- Şirket unvanı, vergi/MERSİS, resmi adres, destek e-postası/telefonu, kargo ve iade adresi, saklama süreleri ve aktarım düzenlemesi `src/lib/company-info.ts` içinde açık placeholder olarak duruyor. Gerçek bilgiler olmadan hukuki metinler tamamlanmış kabul edilmez.
- Ödeme, teslimat sağlayıcısı, gerçek mail gönderimi ve sipariş üretimi açılmamıştır.

## Hukuki taslakların kaynakları

Metinler özgün taslaktır; başka mağazalardan kopyalanmamıştır. Şirket bilgileri ve faaliyet bazlı veri envanteri tamamlanınca son inceleme gerekir.

- [Ticaret Bakanlığı — Mesafeli sözleşmeler hakkında bilgilendirme](https://tuketici.ticaret.gov.tr/yayinlar/tuketici-bilgi-rehberi/mesafeli-sozlesmeler-hakkinda-bilgilendirme)
- [KVKK — Aydınlatma yükümlülüğü](https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-)

Canlı uygulama için ayrı kullanıcı onayı gereklidir. Yerel test başarısı bu onayın yerine geçmez.

## Son doğrulama — 30 Eylül 2026

- 164 test: 164 başarılı, 0 başarısız, 0 skip (`MC_PGLITE_MODULE` tanımlı).
- `tsc --noEmit`: başarılı.
- Production build: başarılı; generated dosyaların ana çalışma alanını değiştirmemesi için geçici kopyada çalıştırıldı.
- Mock ortamında `/`, `/kadin`, `/erkek`, `/yeni-gelenler`, `/koleksiyon`, `/profil`, `/iade`, `/gizlilik`, `/kvkk`, `/yonetim`: HTTP 200. Mock bulunan ürün HTTP 200; olmayan ürün HTTP 404.
- Client build içinde `SUPABASE_SERVICE_ROLE_KEY` adına rastlanmadı; secret değerleri raporlanmadı.
- Admin girişi kullanıcı tarafından doğrulandı. Önceki hatanın kesin tarihsel nedeni yeniden üretilemedi; rol/RLS/owner akışı değiştirilmedi.
- Geçici UI fixture kayıtları yalnız mock belleğinde tutuldu; gerçek müşteri/adres/başvuru/sipariş kaydı oluşturulmadı.

## Aşama commitleri

- `5a48cfc`: misafir sepeti merge, kalıcı istek kimliği ve toparlama.
- `7fa9752`: perakende fiyat gösterimi ve onaylı logo/üst şerit.
- `9092944`: adres doğrulama ve private varsayılan adres taslağı.
- `a76cff0`: iade/değişim, private fotoğraf ve kapalı bildirim altyapısı.
- `e659d8c`: kullanıcı değişiminde profil temizliği ve başvuru sipariş bağlamı.
- `d79fd44`: gerçek kayıtlarla admin genel bakış ve koleksiyon özeti.
- `c4e1065`: şirket placeholder yapılandırması ve özgün politika taslakları.

Bu altyapı canlı satışa hazır onayı değildir. Tam migration zinciri, çok bağlantılı yarış, gerçek Storage MIME/içerik doğrulaması, gönderim sağlayıcısı ve hukuki/şirket eksikleri tamamlanmadan yayın yapılmamalıdır. Gelişmiş müşteri yönetimi ve ayrı fiyat/ayar modülleri ayrıca genişletilebilir; mevcut ürün/fiyat/stok düzenleyicisi korunmuştur.
