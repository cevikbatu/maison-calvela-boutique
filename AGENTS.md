# Maison Calvela — Ortak Çalışma Kuralları

Bu depo Maison Calvela kadın ve erkek moda e-ticaret sitesine aittir. Kullanıcıyla Türkçe iletişim kur.

## Kapsam
- Marka: Maison Calvela. Hem kadın hem erkek ürünleri desteklenir.
- Marka dili: premium, zarif, sade; Türkçe arayüz. Mevcut onaylı logo ve marka kimliğini koru.
- MIAMOR ayrı bir projedir. MIAMOR verilerini ve dosyalarını bu depoya ekleme.
- `Model_Iplik_Takip_Listesi.xlsx` MIAMOR'a aittir; ekleme, taşıma veya silme.

## Git ve değişiklik güvenliği
- Çalışma dalı `gelistirme`; `main` dalına doğrudan push, merge veya force push yapma.
- Canlı yayın, veritabanı migration uygulaması, anahtar rotasyonu, erişim yetkisi değiştirme ve veri silme öncesinde kullanıcıdan açık onay al.
- Küçük, geri alınabilir kod/dokümantasyon değişikliklerini geliştirme dalında yap; işlem sonunda değişiklikleri ve test sonuçlarını açıkça raporla.
- Başka bir ajanın veya kullanıcının mevcut değişikliklerini ezme. İşe başlamadan önce dal ve çalışma ağacı durumunu kontrol et.
- Harici entegrasyonların durumunu doğrulamadan otomatik yayın olmadığı varsayımında bulunma.

## Güvenlik
- `.env` ve diğer gerçek sırları commit'e dahil etme; yalnızca boş örnek değerleri `.env.example` içinde tut.
- Token, anahtar veya kişisel verileri günlüklerde ve yanıt metninde gösterme.
- Yönetici erişiminde sunucu tarafı yetki denetimini koru; servis rolü anahtarlarını istemciye taşıma.
- Ödeme, sipariş, stok, fotoğraf yükleme ve RLS değişikliklerinde güvenlik ve regresyon testlerini önceliklendir.

## Kalite ve raporlama
- Varsa lint, build, hedefli testler ve güvenlik kontrollerini çalıştır; çalıştırılamayan kontrolleri başarılı gibi gösterme.
- Kritik değişikliklerde önce etki alanını, riski ve geri dönüş yolunu belirt.
- Her teslimde değişen dosyaları, dal/commit bilgilerini, test sonuçlarını ve kalan riskleri Türkçe özetle.

## Araçlar arası koordinasyon
- Bu dosya ChatGPT/Codex/Claude/Claude Code için ortak çalışma kaynağıdır.
- `CLAUDE.md` Claude Code'u bu dosyaya yönlendirir; çelişki oluşursa kullanıcı talimatı önceliklidir.
- Ajanların birbirleriyle otomatik konuştuğunu varsayma. Ortak durum Git commit'leri ve doğrulanmış raporlarla paylaşılır.
