# Secret tracking denetimi — değer içermeyen rapor

- `.env` halen tracked. `git log --all -- .env` geçmişinde `c96fa91` (23 Eylül 2026) bulundu. Geçmiş rewrite/rotation/silme yapılmadı.
- Güncel `.env` değişken adları: SUPABASE_PROJECT_ID, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL ve bunların VITE_ karşılıkları. Değerler raporlanmadı. İsimlerine göre bunlar public proje/istemci yapılandırmasıdır; bu sonuç bütün Git geçmişinin secret içermediğinin kanıtı değildir.
- `.gitignore` içindeki `*.local`, `.env.local` dosyasını koruyor; `.env` genel olarak ignore edilmiyor ve zaten tracked. Ignore kuralı eklemek tracked geçmişi temizlemez.
- Mevcut SUPABASE_SERVICE_ROLE_KEY `src/integrations/supabase/client.server.ts` üzerinden owner server fonksiyonlarında kullanılır. Upload için yeni PHOTO_UPLOAD_SERVICE_ROLE_KEY sadece bağımsız `server/photos/main.mjs` process'inde okunur. Uygulama sunucusundaki PHOTO_UPLOAD_SERVER_URL secret içermez; client config'e taşınmaz.
- `.env.example` yeni değişken adlarını boş değerlerle listeler; gerçek anahtar içermez. Public VITE_PUBLIC_INDEXING_ENABLED SEO bayrağıdır, secret değildir.
- Bu tur client public build çıktısı tarandı: SUPABASE_SERVICE_ROLE_KEY, PHOTO_UPLOAD_SERVICE_ROLE_KEY, server/photos ve sharp/lib eşleşmesi bulunmadı. Bu build'e verilmemiş bir secret'ın bütün olası deploy konfigürasyonlarında sızmayacağını kanıtlamaz.

Ayrı kontrollü işlem: bütün erişilebilir Git ref/geçmişi için güvenli secret scanner, eski anahtar sınıfı incelemesi ve gerekirse ilgili gerçek secret rotasyonu. `.env` takibini kaldırma ayrıca planlanmalı; dosya yerelde korunmalıdır. Bu tur key değişimi, filter-repo, force push veya production key işlemi yapılmadı.
