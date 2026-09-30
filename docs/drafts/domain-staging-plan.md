# calvela.com ve staging — uygulama yapılmamış teknik plan

## Güncel indexing guard

Kod düzeyindeki guard eklendi: `VITE_PUBLIC_INDEXING_ENABLED` public **build-time** ayarı yalnız tam `true` olduğunda ve `VITE_PUBLIC_SITE_URL` geçerli production HTTPS origin olduğunda indekslemeyi açar. Varsayılan kapalıdır; staging/preview/test/localhost isimleri ve IP originler true olsa bile reddedilir. Bu bayrak secret değildir. Değiştirilirse yeniden build gerekir; staging ve production ayrı build/environment kullanmalıdır.

Kapalı modda server bütün yanıtlarına `X-Robots-Tag: noindex, nofollow` ekler, root HTML robots meta noindex olur, robots.txt `Disallow: /` döner, sitemap 404 olur; sayfa ve ürün canonical/production URL üretilmez. Açık production modunda mevcut SEO origin/robots/sitemap korunur. Kaynak: `src/lib/indexing.ts`, `indexing-config.ts`, `src/server.ts`, root/meta/robots/sitemap. Test: `tests/indexing.test.mjs`.

Aşağıdaki eski robots riski artık kaynak kodda giderildi. Access, alternatif hostname güvenliği, DNS ve canlı staging HTTP doğrulaması yine ayrı gerekliliktir; noindex erişim koruması değildir.

## Mimari ve hedef

Mevcut Vite/TanStack Start uygulaması SSR/server fonksiyonları ve Nitro Cloudflare çıktısı üretir. Statik dosya hosting'i tek başına yeterli değildir. Bu stack için ilk seçenek Cloudflare Workers + Custom Domains'dir. Worker hesabı/ismi, ücretli limitler, runtime uyumluluğu, staging build ve server secret erişimi doğrulanmadan üretim seçimi kesinleşmiş sayılmaz. Alternatif Node hosting seçilirse Nitro preset ve aynı SSR/auth testleri ayrıca gerekir.

Bu çalışma DNS veya hosting hesabına bağlanmaz. Aşağıdakiler koşullu kayıt planıdır; bilinmeyen IP, CNAME hedefi veya Cloudflare nameserver değeri uydurulmamıştır.

| Ad | Planlanan kullanım | Gerekli kayıt / hedef |
| --- | --- | --- |
| calvela.com | Ana HTTPS origin | Workers Custom Domain bağlandığında Cloudflare'ın yönettiği kayıt/sertifika; elle rastgele A veya CNAME yazılmaz. Harici hosting seçilirse yalnız sağlayıcının doğruladığı A/AAAA veya apex-compatible CNAME hedefi. |
| www.calvela.com | Ana domaine kalıcı yönlendirme | Ayrı Custom Domain veya Cloudflare proxied hostname + Redirect Rule. https://calvela.com'a path/query korunarak 301/308; redirect loop testi gerekir. |
| staging.calvela.com | Sadece ekibin eriştiği test | Ayrı staging Worker/Custom Domain; önce Access kuralı, sonra erişim testi. Bu tur kayıt oluşturulmaz. |
| MX/TXT/DKIM/DMARC/CAA ve diğer adlar | Mevcut servisler | Mevcut DNS exportundaki gerçek değerler aynen korunur; mail sağlayıcısı seçilmez. |

Workers Custom Domain DNS ve sertifikayı yönetir: [Cloudflare resmi belge](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/). Harici origin kullanılırsa TLS **Full (strict)**, geçerli origin sertifikası ve hostname doğrulaması gerekir; Flexible kullanılmaz: [SSL modu](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/).

HTTPS redirect açık olmalı; HTTP ve www varyasyonları ana HTTPS origin'e ulaşmalı. HSTS ancak tüm gerekli alt domainlerde TLS doğrulandıktan sonra değerlendirilir; erken includeSubDomains/preload mevcut servisleri bozabilir. Auth/admin/API yanıtları cache edilmemeli; güvenlik/rate-limit kuralları giriş ve başvuru akışını engellemediği test edilmelidir. Service role yalnız server secrets içinde kalır. `OWNER_BOOTSTRAP_ALLOWED_ORIGINS` yalnız onaylı exact HTTPS origin içerir; wildcard eklenmez.

## Natro → Cloudflare nameserver geçişi (daha sonra, ayrı onay)

1. Natro zone exportu ve mevcut kayıtların envanteri alınır: apex, www, bütün subdomainler, MX, SPF, DKIM selectorları, DMARC, CAA, verification TXT, SRV ve TTL.
2. Cloudflare otomatik taraması tam yedek sayılmaz; import sonrası kayıtlar tek tek karşılaştırılır. Mail hostname'leri DNS-only tutulur. Çakışan SPF kayıtları oluşturulmaz.
3. DNSSEC etkinse registrar DS ve yeni DNSSEC geçişi sağlayıcı prosedürüne göre planlanır; eski DS yeni unsigned zone'a bırakılmaz.
4. Yalnız hesaba gerçekten atanmış nameserver adresleri Natro'ya girilir. Registrar transferi gerekmez. Bu adım kullanıcı onayı gerektirir.
5. Yetkili resolver/TTL yayılımı, web ve mail teslimi doğrulanır. Önceki zone ve NS bilgisi geri dönüş için korunur.

[Cloudflare full setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/) izlenmeli. Bu plan hiçbir harici ayarı değiştirmez.

## Staging erişim ve indeksleme

- Ayrı Worker, ayrı environment secrets ve ayrı test Supabase projesi/yerel ortam; gerçek müşteri DB'si kullanılmaz. E-posta ve ödeme kapalıdır.
- Cloudflare Access default-deny; yalnız ekibin kimlikleri, uygun MFA/oturum süresi. Geniş “Everyone allow” veya bypass policy yok. [Access policy belgesi](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/).
- Worker'ın `workers.dev`, preview ve diğer alias yolları kapatılmalı veya aynı Access doğrulamasına tabi olmalı. Sadece staging hostname'i korumak doğrudan alternatif URL'yi korumaz. Gerekirse Worker server tarafında Access JWT issuer/audience doğrulaması yapılır.
- Auth callback, RPC ve asset yolları dahil kimliksiz erişim test edilir. robots/noindex erişim kontrolünün yerine geçmez.
- `X-Robots-Tag: noindex, nofollow`, HTML noindex ve `robots.txt: Disallow: /`; sitemap yayımlanmamalı. **Mevcut robots kodu geçerli HTTPS `VITE_PUBLIC_SITE_URL` görünce indekslemeye izin verir.** Staging URL'sini bu değişkene yazmak tek başına güvenli değildir. Staging için explicit indeksleme kapatma/edge override ve response testi uygulanmadan açılmamalı.
- Production ziyaretçilerine staging linki verilmez; staging yanlışlıkla production canonical üretmemeli. Supabase Auth redirect listesi ayrı exact staging origin'e göre yapılandırılır; production oturumları taşınmaz.

## Bağlamadan önce gerekli gerçek bilgiler

Cloudflare zone/account ve hosting seçimi; gerçek Worker/custom-domain hedefi; mevcut Natro DNS exportu ve DNSSEC durumu; Access ekip kimlikleri; ayrı staging DB/Auth URL'leri; production/staging secret isimleri ve güvenli secret deposu; TLS/redirect ve rollback sorumlusu. Değerler bu belgede uydurulmamıştır.

Durum: DNS/Cloudflare/www/TLS/staging **planı PASS**; gerçek kurulum ve HTTP doğrulaması **NOT TESTED / LATER**. Ana mağazanın satışa açılması ayrıca P0/P1/ödeme/hukuki onaya bağlıdır.
