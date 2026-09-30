# Misafir sepeti birleştirme — onay bekleyen taslak

Durum: Veritabanı taslağı; canlıya uygulanmadı. Mevcut istemci birleştirme akışı henüz değiştirilmedi.

## İnceleme kapsamı

`guest-cart-merge.sql` yalnızca yeni bir özel işlem makbuzu tablosu ve iki fonksiyon ekler. Mevcut ürün, stok, fiyat, rol ve sipariş kayıtlarını değiştirmez. Fonksiyon çağrıldığında yalnızca oturum sahibinin sepetine miktar ekler; stok düşürmez.

- `auth.uid()` zorunlu; kullanıcı ID'si istemciden alınmaz.
- Özel SECURITY DEFINER fonksiyonunun search_path değeri boştur, tablolar tam adlarıyla kullanılır. Yayındaki ürünler açıkça denetlenir.
- Public sarmalayıcı SECURITY INVOKER kullanır. PUBLIC/anon çalıştırma izni yoktur.
- Makbuz tablosunda RLS açık, istemci tablo izinleri kapalıdır.
- `(user_id, request_id)` tekrar denemede aynı sonucu döndürür; aynı kimlikle farklı içerik reddedilir.
- Sepet, varyant ve mevcut sepet satırı kilitleri işlemin parçasıdır. Hata bütün işlemi geri alır.
- Eklenebilecek miktar `max(0, min(stok, 99) - hesap_sepetindeki_miktar)` ile sınırlanır.
- Mevcut miktar stoktan fazlaysa azaltılmaz/silinmez. Misafir miktarının alınamayan kısmı `remaining` olarak döner.
- Eksik/yayında olmayan varyantlar eklenmez; ilgili misafir miktarı korunmak üzere geri bildirilir.

## İstemci entegrasyonundan önce

1. Taslağı tam yerel Supabase şeması üzerinde ve iki bağımsız PostgreSQL bağlantısıyla test et: aynı işlem kimliği, farklı işlem kimlikleri, normal sepet yazımı ile yarış, stok güncellemesiyle yarış ve oturum değişimi.
2. Supabase CLI ile migration dosyası oluştur; bu taslağı otomatik migration dizinine henüz taşıma.
3. Canlı uygulama için kullanıcının ayrıca onayını al; mevcut migrasyonlar ve yetkilerle uyumu kontrol et.
4. İstemcide işlem kimliği + değişmeyen misafir sepeti anlık görüntüsünü ağ isteğinden ÖNCE kalıcı olarak sakla. Sayfa yenilendiğinde aynı kimlik ve içerikle devam et.
5. Birleştirme sırasında hesap sepeti yazılarını sıraya al/durdur. Sekmeler arası koordinasyon sağla. Yeni misafir değişikliklerini bekleyen anlık görüntüden ayrı tut.
6. Başarılı makbuz sonrası yalnızca kabul edilen miktarı misafir kaydından düş; kalan miktarı kullanıcıya göster ve sakla. Yanıt kaybolduğunda yeni işlem kimliği oluşturma.
7. Tamamlanmış makbuz ile yerel kalan miktarın kaydını tek kalıcı kayıt geçişiyle işle; tekrar girişte aynı kalanı istemeden otomatik yeniden göndermeyi önle.
8. Güncel hesap sepetini tekrar oku; eski asenkron cevapların yeni oturumu veya sepeti ezmesini önle.

Bu adımlar tamamlanmadan mevcut güvenli birleştirme aşaması tamamlandı sayılmaz. Migration onayı tek başına tüm istemci entegrasyonunun test edildiği anlamına gelmez.

## İzole test

Test bağımlılığı proje package.json/lock dosyalarına eklenmedi. Geçici dizinde `@electric-sql/pglite@0.5.8` kullanıldı. Testler bellek içi PostgreSQL oluşturur; Supabase URL/secret kullanmaz.

PowerShell:

```powershell
$env:MC_PGLITE_MODULE = Join-Path $env:TEMP 'maison-calvela-db-tests/node_modules/@electric-sql/pglite/dist/index.js'
node --test tests/guest-cart-merge-db.test.mjs
```

Ortam değişkeni verilmezse bu isteğe bağlı test atlanır; bu durum başarıyla doğrulanmış veritabanı testi olarak raporlanmamalıdır.

10 senaryo (üst testle birlikte 11 test) geçti. Fixture üretim şemasının ilgili kolon/constraint alt kümesini temsil eder; tüm Supabase migration zincirini, PostgREST/JWT davranışını veya çok bağlantılı kilit rekabetini doğrulamaz.

## Devam engeli

Bu makinede `supabase`, `docker`, `psql` komutları bulunamadı. PGlite, SQL ve yetki testlerini mümkün kıldı ancak gerçek çok bağlantılı eşzamanlılık doğrulamasını karşılamaz. Bir sonraki işlem izole, çok bağlantılı PostgreSQL/Supabase test ortamı sağlamaktır. Canlı Supabase test ortamı olarak kullanılmamalıdır.
