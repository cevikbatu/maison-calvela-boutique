# Yerel geliştirme ve canlıya geçiş sınırı

## Son P0 turu — 30 Eylül 2026 (güncel)

Yerel kod commitleri: `3f54418` (cart/merge ortak kilit RPC), `7c68ab0` (retail kolon yetkileri), `7400455` (server fotoğraf hattı, Storage slotları, indexing guard ve testler). Push yapılmadı.

Bu bölüm aşağıdaki önceki raporların yerini alır. P0 genel durumu **BLOCKED**: gerçek bağımsız bağlantı PostgreSQL ve gerçek Supabase HTTP ortamı yok. Bunların kurulumu otomatik yapılmadı; minimum adımlar [yerel ortam belgesinde](p0-local-environment.md).

| Kontrol | Güncel durum | Kanıt |
| --- | --- | --- |
| Normal cart write / guest merge kayıp güncellemesi | PASS (SQL seri interleaving), NOT TESTED (gerçek yarış) | Aynı parent lock + expected quantity RPC; doğrudan client cart DML kapalı. `p0-mutations-db.test.mjs`, `cart-stock.test.mjs`. |
| Gerçek concurrency / deadlock / eşzamanlı slot | BLOCKED | `guest-cart-concurrency.test.mjs` hazır; normal write vs merge ve slot yarışları eklendi. PostgreSQL sunucusu yok; SKIP. |
| Server upload / byte decode | PASS (yerel decoder ve handler testleri) | `server/photos/`, `photo-validation.test.mjs`: gerçek JPEG/PNG/WebP, sahte tür, zero byte, corrupt/truncated, şüpheli trailing içerik, >5 MB, aşırı piksel. Metadata'sız WebP. |
| Server quota / idempotency | PASS (PGlite) | Üç slot, request lock, upload ID/hash replay; 4. slot reddi. `p0-mutations-db.test.mjs`. Gerçek concurrent servis testi bekliyor. |
| Direct Storage client write kapatma | PASS (SQL), NOT TESTED (HTTP) | Pending migration restrictive INSERT/UPDATE/DELETE sınırı; owner/admin completed-object read. `service-authorization-chain.test.mjs`. |
| JWT → PostgREST / Storage HTTP / signed URL expiry | NOT TESTED | `supabase-http.test.mjs` loopback-only opt-in hazır; local Supabase bulunmadığından SKIP. |
| Public price policy | PASS | Tablo SELECT kaldırıldı, dört retail kolonuna explicit grant. Sonradan private_cost eklenerek anon/auth erişim reddi test edildi. |
| Secret tracking audit | PASS (metadata incelemesi), BLOCKED (tam geçmiş secret taraması) | `.env` tracked; `.env.local` ignored. [Değersiz denetim raporu](secret-tracking-audit.md). Key/rotation/geçmiş değişikliği yapılmadı. |
| Client bundle server-secret ayrımı | PASS (bu build'in isim/modül taraması) | Public output'ta SUPABASE_SERVICE_ROLE_KEY, PHOTO_UPLOAD_SERVICE_ROLE_KEY ve native upload modülü bulunmadı. Bütün deploy konfigürasyonlarına dair genel kanıt değildir. |
| Staging indexing guard | PASS | `VITE_PUBLIC_INDEXING_ENABLED` default off. `indexing.test.mjs`: gerçek page/product metadata dahil. Local HTTP: kapalı modda root noindex, robots Disallow, sitemap 404; açık modda robots/sitemap 200. Local mock API kullanıldı. |
| Clean migration chain | PASS (PGlite) | Aynı 19 migration yeniden uygulandı. |
| Upgrade chain | PASS (PGlite) | 15 eski + 4 güncellenmiş pending; mevcut fixture stok/SKU/adres korundu. |
| Authorization / service request / guest cart / retail tests | PASS (yerel) | Tüm test setine dahil; admin/owner erişim kontrolü gevşetilmedi. |
| Tüm testler | PASS + 2 NOT TESTED | **191 toplam, 189 pass, 0 fail, 2 skip**. Skip: gerçek PostgreSQL ve Supabase HTTP. |
| TypeScript | PASS | `tsc --noEmit --pretty false`, exit 0. |
| Production build | PASS | Geçici kopyada Vite/Nitro build, exit 0. Ana routeTree değiştirilmedi. |

### Önemli işletim sınırları

Upload decoder yeni `sharp@0.35.5` native bağımlılığıdır; Cloudflare içine taşınmaz, ayrı Node servisinde çalışır. Son kullanıcı UI'si aynı-origin proxy kullanır. Node servisi/matching migration'lar/env olmadan upload 503 verir; güvensiz doğrudan upload fallback'i yoktur. Fotoğrafsız başvuru korunur. Normal cart RPC de matching migration gerektirir; eski şemaya eksik deploy yapılmamalı. Canlıya hiçbir dosya uygulanmadı.

Kalan P0 engelleri: gerçek multi-connection DB/Storage/Auth HTTP doğrulaması; Node servisinin hedef ortam/ingress/secret/memory sınırlarının doğrulanması; kalıcı yarım kalmış slotların audit'li operasyonel kurtarma prosedürü. Başarısız/şüpheli upload'a otomatik yeni slot veya overwrite verilmez. İzole ortam sağlanınca hazır testler çalıştırılmalıdır.

Gelişmiş müşteri/fiyat/ayar UI'ları, gerçek mail, ödeme, DNS ve deployment bu tur yapılmadı. Önceden kalan ZIP'ler ve `supabase/.temp/` korunur, commit'e dahil edilmez.

---

## Önceki raporlar (tarihsel)

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

## Önceki doğrulama — 30 Eylül 2026, 184b7d8

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

Bu altyapı canlı satışa hazır onayı değildir. Tam migration zinciri, çok bağlantılı yarış, gerçek Storage içerik doğrulaması, gönderim sağlayıcısı ve hukuki/şirket eksikleri tamamlanmadan yayın yapılmamalıdır. Mevcut ürün/fiyat/stok düzenleyicisi korunmuştur.

## Güncel P0 kapısı — 30 Eylül 2026

Testler ve pending migration kilit düzeltmesi: yerel commit `875e2ad` (`test: verify migration chain and request authorization`).

Durumlar yalnız belirtilen kanıt kapsamındadır. PGlite SQL policy testleri gerçek Supabase HTTP/JWT veya Storage dosya doğrulaması değildir. Önceki tarayıcı sonuçları bu tur yeniden çalıştırılmadı.

| Alan | Durum | Kanıt / kalan iş |
| --- | --- | --- |
| Pending migration audit | PASS (yerel kaynak) | [Ayrıntılı denetim](p0-migration-audit.md); dört dosya. Request item SELECT için FOR SHARE eklendi. Remote şema drift kontrolü yapılmadı. |
| Clean migration chain | PASS (PGlite) / NOT TESTED (gerçek Supabase) | `tests/migration-chain.test.mjs`: bütün 19 migration. |
| Upgrade chain | PASS (PGlite) / NOT TESTED (gerçek Supabase) | Aynı test: 15 eski + 4 pending; varyant ID/stok/SKU/timestamp ve adres korunuyor. |
| PostgreSQL concurrency | BLOCKED | Yerel PostgreSQL/Docker sunucusu yok; otomatik kurulum yapılmadı. `tests/guest-cart-concurrency.test.mjs` opt-in, SKIP. |
| Guest merge idempotency / partial / 99 / rollback | PASS (PGlite) | Mevcut guest merge DB/unit testleri. Gerçek bağlantı yarışı ve normal cart yazımlarıyla paralellik NOT TESTED. |
| Storage gerçek byte/MIME doğrulaması | FAIL | Yalnız beyan edilen MIME/boyut kontrolü var. Kullanıcı geçici kapatmayı istemedi; mevcut upload korundu. Güvenli server hattı [audit belgesinde](p0-migration-audit.md) tasarlandı, uygulanmadı. |
| Storage RLS | PASS (SQL fixture) / NOT TESTED (HTTP) | `tests/service-authorization-chain.test.mjs`: owner/admin okuyabilir, other/anon okuyamaz. Signed URL/gerçek byte/Storage API testleri eksik. |
| Return/exchange authorization | PASS (PGlite) | Gerçek migration/has_role ile müşteri izolasyonu, admin karar alanları, self-promotion engeli, ret gerekçesi/audit/customer status. Mevcut DB testi kanuni talep ayrımını da doğrular. |
| Admin authorization | PASS (kod/SQL + önceki kullanıcı doğrulaması) | Çalışan rol/owner kontrolü değiştirilmedi. Canlı hesap yetkileri bu tur tekrar sorgulanmadı. |
| Tüm testler | PASS + 1 NOT TESTED | 173 toplam, 172 pass, 0 fail, 1 skip (gerçek PostgreSQL). `MC_PGLITE_MODULE` tanımlı. |
| TypeScript | PASS | `tsc --noEmit --pretty false`, exit 0. |
| Production build | PASS | Bun/Vite/Nitro build, exit 0; geçici kopya, ana routeTree değişmedi. |
| Gelişmiş müşteri yönetimi | BLOCKED | Kullanıcının P0 öncelik şartı nedeniyle başlanmadı; sahte müşteri/sipariş oluşturulmadı. |
| Ayrı fiyat yönetimi | BLOCKED | P0 sonrası; mevcut gerçek fiyat/ürün/stok editörü korundu. |
| Mağaza ayarları | BLOCKED | P0 sonrası; onaylı logo/slogan ve şirket placeholderları korundu. |
| DNS / Cloudflare planı | PASS (plan) | [Domain/staging planı](domain-staging-plan.md); kayıtlar koşullu, hedef IP uydurulmadı. |
| www / HTTPS / TLS planı | PASS (plan) | Aynı belge; gerçek uygulama NOT TESTED. |
| Staging planı | PASS (plan) | Access, alternatif hostname bypass, ayrı DB/env, noindex/robots. Mevcut HTTPS URL'nin robots'a etkisi açıklandı. |
| Gerçek e-posta sağlayıcısı/sender | LATER | Outbox gönderimi kapalı kalır. |
| Şirket resmi bilgileri | LATER | Uydurulmaz. |
| Nihai hukuk incelemesi | LATER | Kanuni haklar korunur; uzman son onayı ayrı. |
| Ödeme sağlayıcısı | LATER | Checkout/tahsilat açılmadı. |
| Production secrets son yapılandırma | LATER | Secret değerleri değiştirilmedi veya raporlanmadı. |
| DNS geçişi / production deployment | LATER | Hiçbir dış işlem yapılmadı; ayrı onay gerekir. |

P0 tamamlanmış değildir. Fotoğraf sunucu doğrulaması, gerçek çok bağlantılı PostgreSQL ve Supabase Storage/Auth HTTP doğrulaması yayın engelleridir. Bu engeller müşterilerin veya stokların canlı ortamda değiştirilmesiyle test edilmemelidir. `.env` dosyasının geçmişten gelen Git takibi ayrıca kontrollü secret denetimi gerektirir; bu tur içeriği değiştirilmedi.
