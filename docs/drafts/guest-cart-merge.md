# Misafir sepeti birleştirme — yerel uygulama ve canlıya geçiş sınırı

Canlı veritabanına uygulanmadı. Uygulamanın yeni birleştirme çağrısı için `supabase/migrations/20260930173000_guest_cart_merge.sql` gereklidir. Migration yoksa hata gösterilir, misafir kayıtları korunur ve doğrulanmamış hesap değişiklikleri engellenir.

## Uygulanan davranış

- İşlem kimliği ve değişmeyen misafir anlık görüntüsü RPC çağrısından önce `mc-cart-state-v2` altında saklanır.
- Beklenen hesap kimliği RPC'ye gönderilir; veritabanı bunu `auth.uid()` ile karşılaştırır. İstemci hesabı yetki kaynağı değildir.
- Kayıp yanıt sonrası aynı kimlik ve içerikle tekrar denenir. Tamamlanmış makbuz yeniden miktar eklemez.
- Kabul edilen miktar misafir kaydından düşülür; kalan miktar korunur ve aynı kullanıcıya otomatik tekrar gönderilmez.
- Oturum geçişinde eski sonuç yeni hesabın yerel durumunu değiştiremez.
- Web Locks ile aynı tarayıcının sekmeleri koordine edilir. Güvenli kilit desteği yoksa birleştirme reddedilir; süreli localStorage kilidi kullanılmaz.
- Normal misafir kaydı, beklenen eski sepeti karşılaştırır. Eski sekme yeni kaydı ezemez; çakışma kullanıcıya bildirilir.
- Bekleyen, sonucu belirsiz birleştirme varken misafir anlık görüntüsü değiştirilmez.
- Artırma sınırları korunur; önceden stok üstünde kalan satırlar sessizce silinmez.

## Veritabanı güvenliği

Makbuz tablosu `app_private` içinde, RLS açık ve istemci tablo izinleri kapalıdır. Ayrıcalıklı fonksiyon özel şemadadır, boş search_path ve açık auth.uid kontrolü kullanır; public sarmalayıcı invoker olarak çalışır. Anon çağrı yapamaz. Ürün/varyant eşleşmesi tamdır ve ürün yayında olmalıdır. İşlem stok düşürmez veya rezervasyon yapmaz.

## Testler ve sınırları

`MC_PGLITE_MODULE` geçici dizindeki `@electric-sql/pglite@0.5.8/dist/index.js` dosyasını gösterdiğinde gerçek PostgreSQL motorunda izole fixture testleri çalışır. Gerçek Supabase URL veya secret kullanılmaz. Bu değişken yoksa isteğe bağlı DB testi skip olur.

Client testleri gerçek TypeScript modülünü mock storage/RPC/Web Locks ile çalıştırır. Provider testleri başarılı/kısmi/başarısız login birleşmesini kapsar. Tarayıcıda mock API ile iki sekmede azaltma/kaldırma senkronizasyonu kontrol edildi.

PGlite tek bağlantılıdır. Ayrı PostgreSQL bağlantıları arasındaki kilit rekabeti, tam Supabase migration zinciri ve PostgREST kimlik aktarımı bu testlerle doğrulanmış sayılmaz. Aynı veritabanındaki normal sepet yazımları başka cihazlarda çalışmaya devam edebileceğinden, işlem sonrası stok değişimleri için son sipariş doğrulaması ayrıca gerekir.

## Canlı uygulamadan önce

1. Tam izole Supabase/PostgreSQL ortamında migration zincirini ve iki bağlantılı kilit rekabetini doğrula.
2. Canlı migration için kullanıcı onayı al. Şu ana kadar canlı DDL/veri işlemi yapılmadı.
3. Migration ile uyumlu istemci sürümünü birlikte yayınla; bu görevde yayın/push yok.
4. Gerçek hesapla giriş ve oturum değiştirme kontrolünü kullanıcı ile yap.
