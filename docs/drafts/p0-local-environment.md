# Kalan gerçek servis testleri ve upload işletimi

## Yerel PostgreSQL: en az müdahaleli seçenek

Makinede Docker/PostgreSQL/psql PATH üzerinde bulunmadı. Önceden cache'lenmiş Supabase CLI tek başına DB/Storage sunucusu sağlamaz. Hiçbiri bu görevde otomatik kurulmadı.

Yalnız concurrency için en az müdahaleli seçenek Windows portable PostgreSQL binary arşivi: Windows service, PATH veya mevcut DB değiştirmeden ayrı dizine çıkarılır. [Resmi Windows indirme sayfası](https://www.postgresql.org/download/windows/) üzerinden güncel, desteklenen sürüm ve kaynağı doğrulanmalıdır. Kullanıcı indirdikten sonra örnek komutlar:

```powershell
# C:/qa/pgsql ve C:/qa/mc-pg-data yalnız bu test için yeni/boş dizinler olmalı.
C:/qa/pgsql/bin/initdb.exe -D C:/qa/mc-pg-data -U postgres --auth-host=scram-sha-256 --auth-local=scram-sha-256 -W
C:/qa/pgsql/bin/pg_ctl.exe -D C:/qa/mc-pg-data -l C:/qa/mc-pg.log -o '-h 127.0.0.1 -p 55432' start
C:/qa/pgsql/bin/createdb.exe -h 127.0.0.1 -p 55432 -U postgres mc_test_cart
```

Parola komut geçmişine yazılmamalı; yerel .pgpass/PGPASSFILE izinleri ile sağlanabilir. Ayrı QA alanında `pg` Node driver gerekir; repo üretim bağımlılığı değildir. `MC_PG_URL` yalnız loopback / `mc_test_` DB, `MC_PG_MODULE` driver dosyası, `MC_DISPOSABLE_PG=yes` ayarlanır; ardından `node --test tests/guest-cart-concurrency.test.mjs`. Ortam localhost tüneliyle canlı DB'ye bağlı olmamalıdır. Test yeni cluster'da roller/fixture oluşturur; mevcut development cluster kullanılamaz. Testler bitince yalnız bu cluster `pg_ctl -D C:/qa/mc-pg-data stop` ile durdurulur; dosyalar otomatik silinmez.

Test artık normal cart RPC ile merge yarışını, eski doğrudan UPDATE'in reddini, tekrar eden yarışları ve bağımsız bağlantılarla fotoğraf slot kotasını içerir. Bu makinede NOT TESTED; PGlite aynı testin yerini tutmaz.

## Gerçek Supabase servis katmanı

Tercih local Supabase: kullanıcı onaylı Docker Desktop/uygun container runtime ve Supabase CLI kurulumundan sonra **ayrı bir QA dizininde**, production `.env`/link bilgisi taşınmadan CLI init/start yapılır. Önce `supabase --help`, `supabase init --help`, `supabase start --help`, `supabase db reset --help` ile kullanılan sürümün komutları doğrulanır. Bu repodaki production project_id içeren config doğrudan kopyalanmaz. Yalnız migration dizini QA projesine kopyalanır; `supabase db reset --local` yalnız yeni disposable ortamda çalıştırılır. `db push`, link veya remote migration uygulanmaz.

Yerel Auth üzerinde üç fixture hesabı (owner müşteri, diğer müşteri, admin), admin role satırı ve owner'a ait tek sipariş/ürün/iade başvurusu hazırlanır. Gerçek müşteri verisi kopyalanmaz. En az bir boş fotoğraf slotu gerekir. Yerel JWT/API değerleri secret olarak shell/environment üzerinden verilir; log veya commit'e konmaz.

`tests/supabase-http.test.mjs` için: `MC_LOCAL_HTTP_TEST=yes`, `MC_HTTP_URL`, `MC_PHOTO_URL` (yalnız HTTP localhost), `MC_HTTP_ANON_KEY`, `MC_OWNER_JWT`, `MC_OTHER_JWT`, `MC_ADMIN_JWT`, `MC_REQUEST_ID`. Upload servisi aynı disposable Supabase'e bağlı olmalıdır. Test Auth JWT → RLS, owner/admin/other/anon, doğrudan Storage yasağı, private download, signed URL erişimi/süre sonu ve endpoint authorization kontrol eder. Test fixture'larını saklar; disposable ortam operatör tarafından kapatılır.

Docker mümkün değilse ikinci seçenek ayrıca yetkilendirilecek, üretimden tamamen ayrı Supabase test projesidir. Mevcut harness loopback dışını reddeder; remote test projesine uyarlama için açık project-ID allowlist ve ayrı onay gerekir. Bu tur remote proje oluşturulmadı. Gerçek HTTP sonuçları NOT TESTED.

## Upload servisi

Uygulama kararları için resmi kaynaklar: [Sharp constructor / failOn ve pixel limitleri](https://sharp.pixelplumbing.com/api-constructor/), [Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser), [Storage erişim kontrolü](https://supabase.com/docs/guides/storage/security/access-control), [local Supabase](https://supabase.com/docs/guides/local-development). Güncel changelog incelendi; mevcut uygulamayı yeni middleware paketine taşıyan gereksiz bir refactor yapılmadı.

`server/photos/main.mjs` bağımsız Node 22+ servisidir. `sharp@0.35.5` sabit sürümü JPEG/PNG/WebP decode + WebP yeniden encode sağlar. Native libvips mevcut Workers bundle'ına alınmaz. Node servisinin loopback listener'ı güvenilir HTTPS reverse proxy üzerinden uygulama sunucusuna sunulur; public client direkt bu servise bağlanmaz. Üretim örneği/deployment bu görevde oluşturulmadı.

Server ortamı: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `PHOTO_UPLOAD_SERVICE_ROLE_KEY`, isteğe bağlı `PHOTO_UPLOAD_PORT` (varsayılan 9889). Başlatma: `node server/photos/main.mjs`. Değerler yalnız güvenli secret store'dan sağlanır; `.env` dosyası otomatik yüklenmez. Worker/app server ortamında `PHOTO_UPLOAD_SERVER_URL` exact HTTPS service origin bulunur; geliştirmede localhost HTTP mümkündür. Ayar eksikse endpoint 503 verir, doğrudan Storage fallback'i yoktur. Fotoğrafsız başvuru bağımsız kalır.

Akış: JWT `getUser` doğrulaması → kullanıcı RLS ile sahiplik → en çok 5 MB body → signature/MIME/uzantı + container sınırı → decoder/piksel kontrolü → metadata'sız WebP → SHA-256 → request row lock ile üç slot/idempotent kimlik → immutable Storage upload → complete. Kayıp Storage yanıtında mevcut nesnenin hash'i karşılaştırılır, overwrite yapılmaz. Completed slot dışındaki nesneler müşteriye görünmez.

UI aynı request/dosya hash'i için upload UUID'sini localStorage'da tutar; ağ hatasında/yeniden açıldığında aynı dosyanın tekrar seçilmesi aynı slotu kullanır. Başarısız reserve sonrası slot otomatik serbest bırakılmaz: belirsiz upload sonucu varken 4. dosyaya kapı açılmaz. Kalıcı bozuk reservation için sonraki aşamada audit'li operasyonel recovery gerekir; sessiz silme yapılmaz.

Güvenlik sınırları: 16 milyon piksel, dosya başına 5 MB, iki eşzamanlı decode/servis instance, decoder süresi ve dış istek timeout'u. Re-encode EXIF ve taşınabilir payload'ı kaldırır. Şüpheli marker kontrolü muhafazakârdır ve bazı meşru dosyaları reddedebilir; tüm polyglot türlerinin matematiksel kanıtı değildir. Native decoder güvenlik güncellemeleri takip edilmeli; servis container memory/CPU ve ingress rate/timeout limitleri ayrıca ayarlanmalıdır. Servis key'i geniş yetkilidir; yalnız bu izole sunucunun secret deposunda tutulur. Canlı HTTP testi ve işletim ayarları olmadan P0 PASS verilmez.

## Dağıtım bağımlılığı

Pending migration'lar henüz canlıda yoktur. Normal cart kayıtları artık `set_cart_quantity` RPC'sine, fotoğraf hattı slot RPC/policy'lerine ihtiyaç duyar. Kod/migration/Node servis ayrı ayrı eksik deploy edilmemeli. Yeni API yoksa mevcut toparlama/503 davranışı güvenli şekilde hata verir; güvensiz eski yazıma dönülmez. Önce disposable ortamda bütün zincir, sonra ayrıca onaylı uygulama gerekir.
