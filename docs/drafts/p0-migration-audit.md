# P0 migration denetimi — 30 Eylül 2026

Yalnız repository ve izole yerel testler incelendi. Canlı şema/migration geçmişi okunmadı veya değiştirilmedi. “Pending” burada önceki çalışma raporundaki dört uygulanmamış dosyayı ifade eder; remote migration listesiyle doğrulanmış değildir.

## Sıra ve kapsam

15 eski migration + aşağıdaki dört migration, dosya adına göre sıralanarak çalışır. `tests/helpers/migration-chain.mjs` uygulama şemasını taklit etmez; gerçek dosyaları transaction içinde uygular. Yalnız Auth/Storage platform tabloları ve `auth.uid()` arayüzü fixture'dır. Bu nedenle Supabase servis/JWT/Storage HTTP uyumluluğu ayrıca sınanmalıdır.

| Migration | Şema / constraint / index / trigger | Fonksiyon, yetki ve Storage | Risk, bağımlılık ve kilit |
| --- | --- | --- | --- |
| `20260930170024_customer_default_address.sql` | addresses üzerinde `(user_id,id)` unique; default_addresses kullanıcı PK, profile FK ve aynı kullanıcı/adrese composite FK. Yeni trigger yok. | Kullanıcı yalnız kendi varsayılan adresini CRUD edebilir. Storage/RPC yok. | profiles ve addresses gerekir. Veri silmez. Unique constraint oluşturulması mevcut addresses üzerinde kilit/index oluşturur; büyük tabloda maintenance penceresi gerekir. Aynı isimli mevcut nesne varsa migration başarısız olur; drift gizlenmez. |
| `20260930170543_customer_service_requests.sql` | orders.delivered_at nullable; requests, history, private email queue. UUID PK/FK, tür/durum CHECK; owner/created, status/created ve history request/created indexleri. Yeni trigger yok; updated_at karar RPC'sinde güncellenir. | İki private SECURITY DEFINER implementation ve iki public INVOKER wrapper, boş search_path ve nitelikli tablo adları. auth.uid sahibi; karar için gerçek admin rolü. İstemci yalnız SELECT. Audit/outbox transaction içinde; outbox gönderimi CHECK ile kapalı. Private bucket ve sahip/admin okuma, sahip yazma policy. | orders, items, profiles, private has_role ve Storage platformu gerekir. delivered_at ekleme kısa exclusive lock gerektirir; backfill/silme yok. Bucket/policy isim çakışması kontrol edilmeli. Fotoğraf gerçek byte doğrulaması YOK: yayın engeli. Sipariş satırı şimdi FOR SHARE ile kilitlenir; okuma ile sahiplik kontrolü arasında başka transaction'ın satırı taşıması engellenir. Gerçek kilit/deadlock testi henüz yok. |
| `20260930173000_guest_cart_merge.sql` | private receipt PK(user_id,request_id), JSON payload/result, user FK; RLS. Yeni trigger/index yok (PK indexi var). | private DEFINER boş search_path, public INVOKER; authenticated execute; uid/expected user kontrolü; receipt/cart/item kilitleri, ürün/varyant SHARE kilitleri. Storage yok. | cart user ve cart/variant unique constraint gerekir. Migration mevcut satırları değiştirmez. RPC aynı kullanıcı isteklerini serialize eder. Uzun transaction bekleme yaratabilir. Normal doğrudan cart yazımları aynı parent kilit protokolüne bağlı değil: merge dışındaki paralel yazımlar ayrıca sınanmalı. Stok rezervasyonu yapmaz. |
| `20260930180000_public_product_prices.sql` | Yeni tablo/kolon/constraint/index/trigger yok. | Fiyat SELECT grant ve yayımlanmış ürün policy; mevcut admin policy korunur. RPC/Storage yok. | product_prices, products gerekir. Mevcut policy değişimi transaction içinde yapılmalı. Satış/indirim fiyatı var; maliyet alanı yok. İleride tabloya maliyet eklenirse mevcut tablo düzeyi SELECT onu da açabilir; maliyet ayrı private tabloda tutulmalı. Veri silmez. |

Yeni pending dosyalarda veri DROP/TRUNCATE veya stok backfill yok. Eski migration zincirinde tarihsel fiyat taşıma/DROP bulunur; clean/upgrade fixture testinin geçmesi canlı verinin yedeğinin yerini tutmaz. Canlı uygulama öncesi nesne adları, constraint ve platform grants farkları incelenmeli; yedek/geri yükleme denemesi yapılmalı. Hata halinde kör DROP/yeniden kurulum yapılmamalı.

`docs/drafts/guest-cart-merge.sql` aynı merge taslağının ikinci kopyasıdır; migration dizini uygulama için tek kaynaktır. İkisi art arda çalıştırılmamalıdır. Owner self-claim alternatif taslağı migration değildir; bu zincire eklenmez. Çalışan owner/RLS akışı değiştirilmedi.

## Kanıt ve sınırlar

- PASS (PGlite): `tests/migration-chain.test.mjs`, 19 dosya clean install; 15 eski + 4 pending upgrade; 12 ürün / 120 varyant fixture, inventory/SKU/updated_at/adres korunması.
- PASS (PGlite): `tests/service-authorization-chain.test.mjs`, gerçek has_role ve RLS ile müşteri/admin/anon, başvuru/ek/geçmiş izolasyonu ve ret audit'i.
- PASS (PGlite, dar fixture): mevcut `service-requests-db.test.mjs`, kanuni talepleri reddetme engeli, stale karar, outbox ve idempotency.
- NOT TESTED: gerçek Supabase Auth/PostgREST JWT, Storage servisi/signed URL HTTP erişimi; fixture yalnız SQL policy davranışını kanıtlar.
- BLOCKED: gerçek PostgreSQL bağımsız bağlantılı kilit/race testi; çalıştırılabilir test hazır, PostgreSQL sunucusu yok. Otomatik kurulum yapılmadı.
- FAIL: fotoğraf gerçek içerik doğrulaması; file.type/MIME/uzantı yeterli değildir. Kullanıcının kararıyla mevcut yükleme bu tur değiştirilmedi.

## Gerçek PostgreSQL testini çalıştırma

Yalnız ayrı, boş, tek kullanımlık LOCAL PostgreSQL cluster kullanın; canlı veya mevcut geliştirme DB'si kullanmayın. Test `anon`, `authenticated`, `service_role` rollerini oluşturur; bunlar cluster kapsamındadır. DB adı `mc_test_` ile başlamalı, host localhost/127.0.0.1 olmalıdır. Yerel portun canlı DB'ye tünel olmadığını operatör doğrulamalıdır.

Ortamı kullanıcı ayrıca kurduktan sonra (bu görevde kurulmadı):

```powershell
# Ayrı yerel PostgreSQL cluster'ın portunu açıkça seçin.
createdb -h 127.0.0.1 -p 55432 -U postgres mc_test_cart
$env:MC_DISPOSABLE_PG='yes'
$env:MC_PG_URL='postgresql://postgres@127.0.0.1:55432/mc_test_cart'
# pg paketinin ayrı QA ortamındaki gerçek dosyası; repo bağımlılığı eklenmedi.
$env:MC_PG_MODULE='C:/qa/node_modules/pg/lib/index.js'
node --test tests/guest-cart-concurrency.test.mjs
```

Gerekli araçlar: PostgreSQL server/client ve ayrı QA alanında Node `pg` driver. Kimlik bilgisini çıktıya veya Git'e yazmayın. Test sonunda DB/roller otomatik silinmez; sonraki deneme için ayrı temiz cluster gerekir. Test yalnız açık opt-in ile çalışır; değişkenler yoksa SKIP olur.

Test iki bağımsız bağlantıyı gerçek kilit beklemesinde buluşturur: aynı ID, farklı ID, önceki miktar, kısmi kabul/kalan, 99, kayıp yanıt/replay ve rollback/retry. Başarılı olması bütün olası deadlock sıralamalarını veya normal cart UPDATE ile yarışları kanıtlamaz. Gerçek Supabase clean/upgrade için ayrıca ayrı yerel Supabase ortamında migration zinciri ve HTTP authorization testleri gerekir; `db push` kullanılmamalı.

## Fotoğraf sunucu hattı için gerekli çözüm

Mevcut doğrudan client upload sunucu kontrolünü atlayabilir. Yalnız client magic-byte kontrolü eklemek bu açığı kapatmaz. Yayın öncesi şu hat birlikte hazırlanmalı ve test edilmelidir:

1. Server/Edge endpoint kullanıcının JWT'sini doğrular; başvuru sahipliği/durumunu kullanıcı bağlamıyla okur. Client user_id güvenilmez.
2. Stream boyutu 5 MB ile sınırlandırılır; JPEG/PNG/WebP signature tespit edilir. MIME ve uzantı gerçek içerikle uyumlu olmalıdır.
3. Güvenilir decoder tüm resmi açar; bozuk/truncated/polyglot, aşırı pixel/decompression boyutu reddedilir; metadata kaldırılarak yeniden encode edilir. Sadece ilk byte kontrolü yeterli değildir.
4. İstek başına en çok 3 ek, DB kilidiyle atomik slot rezervasyonu ve idempotent upload ID ile uygulanır. Hatalı upload slotu güvenle geri kazanır; mevcut dosya ezilmez.
5. Doğrudan authenticated INSERT kapatılır; yalnız bu server hattı private Storage'a yazabilir. Server credential tarayıcıya aktarılmaz. Kullanıcının başka eklerini listeleme/imzalama yasak kalır.
6. Sahte uzantı/MIME, sıfır byte, bozuk görsel, yasak tür, 5 MB üzeri, 4. dosya, eşzamanlı upload, sahip/admin/diğer/anon HTTP testleri çalıştırılır.

Bu server hattı henüz uygulanmadı; decoder/runtime seçimi, slot migration taslağı ve Storage HTTP ortamı gerekir. Fotoğrafsız kanuni başvuru korunmalı. Kullanıcı yüklemeyi geçici kapatmayı onaylamadığı için yalnız bulgu olarak bırakıldı; P0 PASS değildir.
